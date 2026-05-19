import { NextResponse } from 'next/server';

import { getDefaultSystemUserId } from '../../../../shared/mock/system-db';
import { isAuthenticatedRequest } from '../../../entities/session/model/auth';
import {
  ensureTicketOwnedByUser,
  getTicketById,
  SupportAccessError,
  SupportNotFoundError,
  uploadTicketAttachments
} from '../../../entities/support/model/chat-store';
import { unauthorizedResponse } from '../withdrawals/response';

export async function handleUploadUserTicketAttachments(request: Request, ticketId: string) {
  if (!isAuthenticatedRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const ticket = ensureTicketOwnedByUser(getTicketById(ticketId), getDefaultSystemUserId());
    const formData = await request.formData();
    const files = formData.getAll('files').filter(
      (item): item is File =>
        typeof item === 'object' &&
        item !== null &&
        'arrayBuffer' in item &&
        'name' in item
    );

    const attachments = uploadTicketAttachments(
      ticket.id,
      await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          contentType: file.type || 'application/octet-stream',
          transcript:
            typeof formData.get(`transcript:${file.name}`) === 'string'
              ? String(formData.get(`transcript:${file.name}`))
              : null,
          size: file.size,
          bytes: new Uint8Array(await file.arrayBuffer())
        }))
      )
    );

    return NextResponse.json({ attachments }, { status: 201 });
  } catch (error) {
    if (error instanceof SupportNotFoundError) {
      return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
    }

    if (error instanceof SupportAccessError) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
