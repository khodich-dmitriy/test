import { NextResponse } from 'next/server';

import { getSessionFromRequest } from '../../../../../../src/entities/session/model/auth';
import {
  getMessageById,
  setMessageReaction,
  SupportNotFoundError
} from '../../../../../../src/entities/support/model/support-store';

interface Props {
  params: Promise<{ messageId: string }>;
}

interface Payload {
  emoji?: unknown;
}

export async function POST(request: Request, context: Props) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
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

    const { messageId } = await context.params;
    getMessageById(messageId);
    const reaction = setMessageReaction(messageId, 'support', session.username, emoji);

    return NextResponse.json({ reaction }, { status: 200 });
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
