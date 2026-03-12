import { NextResponse } from 'next/server';

import { unauthorizedResponse } from '@/src/app/api/withdrawals/response';
import { isAuthenticatedRequest } from '@/src/entities/session/model/auth';
import { listWithdrawalsFeed } from '@/src/entities/withdrawal/model/mock-withdrawal-store';

export async function handleListWithdrawalsFeed(request: Request) {
  if (!isAuthenticatedRequest(request)) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const rawLimit = Number(searchParams.get('limit') || '20');
  const limit = Number.isFinite(rawLimit) ? rawLimit : 20;

  return NextResponse.json(listWithdrawalsFeed(cursor, limit), { status: 200 });
}
