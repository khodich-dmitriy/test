import { NextResponse } from 'next/server';

import { clearSession } from '../../../src/entities/session/model/auth';

export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  return clearSession(response);
}
