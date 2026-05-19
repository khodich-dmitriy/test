import { NextResponse } from 'next/server';

import { getSessionFromRequest } from '../../../../../src/entities/session/model/auth';
import {
  getSupportUserById,
  getTicketById,
  listMessagesByTicketId,
  SupportNotFoundError
} from '../../../../../src/entities/support/model/support-store';

interface Props {
  params: Promise<{ ticketId: string }>;
}

export async function GET(_request: Request, context: Props) {
  if (!getSessionFromRequest(_request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { ticketId } = await context.params;
  try {
    const ticket = getTicketById(ticketId);
    const user = getSupportUserById(ticket.user_id);
    const messages = listMessagesByTicketId(ticketId);

    return NextResponse.json({ ticket, user, messages }, { status: 200 });
  } catch (error) {
    if (error instanceof SupportNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
