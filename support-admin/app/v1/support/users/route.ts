import { NextResponse } from 'next/server';

import { getSessionFromRequest } from '../../../../src/entities/session/model/auth';
import { listSupportUsers } from '../../../../src/entities/support/model/support-store';

export async function GET(request: Request) {
  if (!getSessionFromRequest(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ items: listSupportUsers() }, { status: 200 });
}
