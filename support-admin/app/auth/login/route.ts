import { NextResponse } from 'next/server';

import { applySession } from '../../../src/entities/session/model/auth';
import { validateSupportLogin } from '../../../src/entities/session/model/login';

interface Payload {
  username?: string;
  password?: string;
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  const session = validateSupportLogin(payload.username ?? '', payload.password ?? '');
  if (!session) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  return applySession(response, session);
}
