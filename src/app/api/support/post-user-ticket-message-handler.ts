import { NextResponse } from 'next/server';

import { getDefaultSystemUserId } from '@/shared/mock/system-db';
import { unauthorizedResponse } from '@/src/app/api/withdrawals/response';
import { isAuthenticatedRequest } from '@/src/entities/session/model/auth';
import {
  appendUserMessage,
  ensureTicketOwnedByUser,
  getTicketById,
  SupportAccessError,
  SupportNotFoundError
} from '@/src/entities/support/model/chat-store';

interface Payload {
  text?: unknown;
  attachment_ids?: unknown;
  reply_to_message_id?: unknown;
}

export async function handlePostUserTicketMessage(request: Request, ticketId: string) {
  if (!isAuthenticatedRequest(request)) {
    return unauthorizedResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  try {
    const ticket = ensureTicketOwnedByUser(getTicketById(ticketId), getDefaultSystemUserId());
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const text = (payload as Payload).text;
    if (typeof text !== 'string') {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const rawAttachmentIds = (payload as Payload).attachment_ids;
    const attachmentIds = Array.isArray(rawAttachmentIds)
      ? rawAttachmentIds.filter((item): item is string => typeof item === 'string')
      : [];
    const rawReplyToMessageId = (payload as Payload).reply_to_message_id;
    const replyToMessageId = typeof rawReplyToMessageId === 'string' ? rawReplyToMessageId : null;
    const message = appendUserMessage(ticket.id, 'demo', text, attachmentIds, replyToMessageId);
    return NextResponse.json(message, { status: 201 });
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
