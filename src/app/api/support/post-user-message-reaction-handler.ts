import { NextResponse } from 'next/server';

import { getDefaultSystemUserId } from '../../../../shared/mock/system-db';
import { isAuthenticatedRequest } from '../../../entities/session/model/auth';
import {
  ensureTicketOwnedByUser,
  getMessageById,
  getTicketById,
  setMessageReaction,
  SupportAccessError,
  SupportNotFoundError
} from '../../../entities/support/model/chat-store';
import { unauthorizedResponse } from '../withdrawals/response';

interface Payload {
  emoji?: unknown;
}

export async function handlePostUserMessageReaction(request: Request, messageId: string) {
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
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const emoji = (payload as Payload).emoji;
    if (typeof emoji !== 'string') {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const message = getMessageById(messageId);
    ensureTicketOwnedByUser(getTicketById(message.ticket_id), getDefaultSystemUserId());
    const reaction = setMessageReaction(messageId, 'user', 'demo', emoji);

    return NextResponse.json({ reaction }, { status: 200 });
  } catch (error) {
    if (error instanceof SupportNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
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
