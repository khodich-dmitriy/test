import type { Withdrawal } from '@/src/entities/withdrawal/model/types';

interface InternalCreateInput {
  amount: number;
  destination: string;
  idempotencyKey: string;
}

interface MockWithdrawalDb {
  withdrawalsById: Map<string, Withdrawal>;
  idByIdempotencyKey: Map<string, string>;
}

declare global {
  var __mockWithdrawalDb__: MockWithdrawalDb | undefined;
}

function getDb(): MockWithdrawalDb {
  if (!globalThis.__mockWithdrawalDb__) {
    globalThis.__mockWithdrawalDb__ = {
      withdrawalsById: new Map<string, Withdrawal>(),
      idByIdempotencyKey: new Map<string, string>()
    };
  }

  return globalThis.__mockWithdrawalDb__;
}

export class DuplicateIdempotencyError extends Error {
  constructor(message = 'Withdrawal with this idempotency key already exists') {
    super(message);
    this.name = 'DuplicateIdempotencyError';
  }
}

function createWithdrawalId(): string {
  return `w_${globalThis.crypto.randomUUID()}`;
}

export function createWithdrawal(input: InternalCreateInput): Withdrawal {
  const db = getDb();
  const existingId = db.idByIdempotencyKey.get(input.idempotencyKey);
  if (existingId) {
    throw new DuplicateIdempotencyError();
  }

  const withdrawal: Withdrawal = {
    id: createWithdrawalId(),
    amount: input.amount,
    destination: input.destination,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  db.withdrawalsById.set(withdrawal.id, withdrawal);
  db.idByIdempotencyKey.set(input.idempotencyKey, withdrawal.id);

  return withdrawal;
}

export function getWithdrawalById(id: string): Withdrawal | null {
  return getDb().withdrawalsById.get(id) ?? null;
}

export function resetMockWithdrawals(): void {
  const db = getDb();
  db.withdrawalsById.clear();
  db.idByIdempotencyKey.clear();
}
