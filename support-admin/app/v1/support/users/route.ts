import { NextResponse } from 'next/server';

import { getSessionFromRequest } from '../../../../src/entities/session/model/auth';
import { listActiveTicketsForStaff, listSupportUsers } from '../../../../src/entities/support/model/support-store';

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  return NextResponse.json(
    {
      items: listSupportUsers(),
      active_tickets: listActiveTicketsForStaff(
        session.username,
        searchParams.get('ticketSearch') ?? ''
      )
    },
    { status: 200 }
  );
}
