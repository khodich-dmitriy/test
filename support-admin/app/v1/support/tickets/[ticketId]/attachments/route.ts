import { NextResponse } from 'next/server';

import { getSessionFromRequest } from '../../../../../../src/entities/session/model/auth';
import {
  SupportNotFoundError,
  uploadTicketAttachments
} from '../../../../../../src/entities/support/model/support-store';

interface Props {
  params: Promise<{ ticketId: string }>;
}

export async function POST(request: Request, context: Props) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { ticketId } = await context.params;
    const formData = await request.formData();
    const files = formData.getAll('files').filter(
      (item): item is File =>
        typeof item === 'object' &&
        item !== null &&
        'arrayBuffer' in item &&
        'name' in item
    );

    const attachments = uploadTicketAttachments(
      ticketId,
      await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
          bytes: new Uint8Array(await file.arrayBuffer())
        }))
      )
    );

    return NextResponse.json({ attachments }, { status: 201 });
  } catch (error) {
    if (error instanceof SupportNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
