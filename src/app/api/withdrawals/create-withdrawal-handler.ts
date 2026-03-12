import { NextResponse } from 'next/server';

import { unauthorizedResponse } from '@/src/app/api/withdrawals/response';
import { isAuthenticatedRequest } from '@/src/entities/session/model/auth';
import {
  createWithdrawal,
  DuplicateIdempotencyError
} from '@/src/entities/withdrawal/model/mock-withdrawal-store';
import type { CreateWithdrawalRequest } from '@/src/entities/withdrawal/model/types';

export async function handleCreateWithdrawal(request: Request) {
  if (!isAuthenticatedRequest(request)) {
    return unauthorizedResponse();
  }

  let payload: CreateWithdrawalRequest;

  try {
    payload = (await request.json()) as CreateWithdrawalRequest;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  if (
    !payload ||
    payload.amount <= 0 ||
    !payload.destination?.trim() ||
    !payload.idempotency_key?.trim()
  ) {
    return NextResponse.json({ message: 'Invalid withdrawal payload' }, { status: 400 });
  }

  try {
    const created = createWithdrawal({
      amount: payload.amount,
      destination: payload.destination,
      idempotencyKey: payload.idempotency_key
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateIdempotencyError) {
      return NextResponse.json({ message: 'Duplicate idempotency key' }, { status: 409 });
    }

    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
