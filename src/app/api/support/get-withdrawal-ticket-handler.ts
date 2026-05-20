import { NextResponse } from 'next/server';

import { getDefaultSystemUserId } from '@/shared/mock/system-db';
import { unauthorizedResponse } from '@/src/app/api/withdrawals/response';
import { isAuthenticatedRequest } from '@/src/entities/session/model/auth';
import {
  ensureTicketOwnedByUser,
  getOrCreateTicketByWithdrawalId,
  listMessagesByTicketId,
  markTicketRead,
  SupportAccessError,
  SupportNotFoundError
} from '@/src/entities/support/model/chat-store';

export async function handleGetWithdrawalTicket(request: Request, withdrawalId: string) {
  if (!isAuthenticatedRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const ticket = ensureTicketOwnedByUser(
      getOrCreateTicketByWithdrawalId(withdrawalId),
      getDefaultSystemUserId()
    );
    markTicketRead(ticket.id, 'user');

    return NextResponse.json(
      {
        ticket: getOrCreateTicketByWithdrawalId(withdrawalId),
        messages: listMessagesByTicketId(ticket.id)
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof SupportNotFoundError) {
      return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
    }

    if (error instanceof SupportAccessError) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
