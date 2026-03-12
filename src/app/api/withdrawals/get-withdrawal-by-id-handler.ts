import { NextResponse } from 'next/server';

import { notFoundResponse, unauthorizedResponse } from '@/src/app/api/withdrawals/response';
import { isAuthenticatedRequest } from '@/src/entities/session/model/auth';
import { getWithdrawalById } from '@/src/entities/withdrawal/model/mock-withdrawal-store';

export async function handleGetWithdrawalById(request: Request, id: string) {
  if (!isAuthenticatedRequest(request)) {
    return unauthorizedResponse();
  }

  const withdrawal = getWithdrawalById(id);

  if (!withdrawal) {
    return notFoundResponse();
  }

  return NextResponse.json(withdrawal, { status: 200 });
}
