import { NextResponse } from 'next/server';

import { getSessionFromRequest } from '../../../../../../src/entities/session/model/auth';
import {
  appendSupportMessage,
  SupportNotFoundError
} from '../../../../../../src/entities/support/model/support-store';

interface Props {
  params: Promise<{ ticketId: string }>;
}

interface Payload {
  text?: unknown;
  attachment_ids?: unknown;
}

export async function POST(request: Request, context: Props) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { ticketId } = await context.params;

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

    const text = (payload as Payload).text;
    if (typeof text !== 'string') {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const rawAttachmentIds = (payload as Payload).attachment_ids;
    const attachmentIds = Array.isArray(rawAttachmentIds)
      ? rawAttachmentIds.filter((item): item is string => typeof item === 'string')
      : [];
    const message = appendSupportMessage(
      ticketId,
      session.username,
      text,
      attachmentIds
    );
    return NextResponse.json(message, { status: 201 });
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
