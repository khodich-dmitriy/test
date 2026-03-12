import { NextResponse } from 'next/server';

import { notFoundResponse, unauthorizedResponse } from '@/src/app/api/withdrawals/response';
import { isAuthenticatedRequest } from '@/src/entities/session/model/auth';
import { deleteWithdrawal } from '@/src/entities/withdrawal/model/mock-withdrawal-store';

export async function handleDeleteWithdrawal(request: Request, id: string) {
  if (!isAuthenticatedRequest(request)) {
    return unauthorizedResponse();
  }

  if (!deleteWithdrawal(id)) {
    return notFoundResponse();
  }

  return new NextResponse(null, { status: 204 });
}
