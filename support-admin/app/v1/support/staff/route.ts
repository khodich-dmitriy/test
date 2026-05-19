import { NextResponse } from 'next/server';

import { getSessionFromRequest } from '../../../../src/entities/session/model/auth';
import { addSupportStaff, listSupportStaff } from '../../../../src/entities/support/model/support-store';

interface Payload {
  username?: string;
}

function unauthorized() {
  return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
}

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return unauthorized();
  }

  return NextResponse.json({ items: listSupportStaff() }, { status: 200 });
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return unauthorized();
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  try {
    const created = addSupportStaff(payload.username ?? '');
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
