import { NextResponse } from 'next/server';

import { getSessionFromRequest } from '../../../../../src/entities/session/model/auth';
import {
  getSupportUserById,
  listTicketsByUserId,
  SupportNotFoundError
} from '../../../../../src/entities/support/model/support-store';

interface Props {
  params: Promise<{ userId: string }>;
}

export async function GET(_request: Request, context: Props) {
  if (!getSessionFromRequest(_request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await context.params;
  try {
    return NextResponse.json(
      {
        user: getSupportUserById(userId),
        tickets: listTicketsByUserId(userId)
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof SupportNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
