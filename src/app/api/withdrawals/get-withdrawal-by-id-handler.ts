import { NextResponse } from 'next/server';

import { isAuthenticatedRequest } from '@/src/entities/session/model/auth';
import { getWithdrawalById } from '@/src/entities/withdrawal/model/mock-withdrawal-store';

export async function handleGetWithdrawalById(request: Request, id: string) {
  if (!isAuthenticatedRequest(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const withdrawal = getWithdrawalById(id);

  if (!withdrawal) {
    return NextResponse.json({ message: 'Withdrawal not found' }, { status: 404 });
  }

  return NextResponse.json(withdrawal, { status: 200 });
}
