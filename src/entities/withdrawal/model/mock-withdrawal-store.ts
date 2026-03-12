import type { Withdrawal } from '@/src/entities/withdrawal/model/types';

interface InternalCreateInput {
  amount: number;
  destination: string;
  idempotencyKey: string;
}

interface MockWithdrawalDb {
  withdrawalsById: Map<string, Withdrawal>;
  idByIdempotencyKey: Map<string, string>;
  idempotencyKeyById: Map<string, string>;
}

declare global {
  var __mockWithdrawalDb__: MockWithdrawalDb | undefined;
}

function getDb(): MockWithdrawalDb {
  if (!globalThis.__mockWithdrawalDb__) {
    globalThis.__mockWithdrawalDb__ = {
      withdrawalsById: new Map<string, Withdrawal>(),
      idByIdempotencyKey: new Map<string, string>(),
      idempotencyKeyById: new Map<string, string>()
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
  db.idempotencyKeyById.set(withdrawal.id, input.idempotencyKey);

  return withdrawal;
}

export function getWithdrawalById(id: string): Withdrawal | null {
  return getDb().withdrawalsById.get(id) ?? null;
}

function listWithdrawalsSorted(): Withdrawal[] {
  return Array.from(getDb().withdrawalsById.values()).sort((left, right) => {
    const timeDiff = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return right.id.localeCompare(left.id);
  });
}

export function listWithdrawalsFeed(cursor: string | null, limit: number): {
  items: Withdrawal[];
  nextCursor: string | null;
  hasMore: boolean;
} {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const sorted = listWithdrawalsSorted();
  const startIndex = cursor ? sorted.findIndex((item) => item.id === cursor) + 1 : 0;
  const resolvedStartIndex = startIndex > 0 ? startIndex : 0;
  const items = sorted.slice(resolvedStartIndex, resolvedStartIndex + safeLimit);
  const hasMore = resolvedStartIndex + safeLimit < sorted.length;

  return {
    items,
    nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
    hasMore
  };
}

export function deleteWithdrawal(id: string): boolean {
  const db = getDb();
  const existed = db.withdrawalsById.delete(id);
  if (!existed) {
    return false;
  }

  const idempotencyKey = db.idempotencyKeyById.get(id);
  if (idempotencyKey) {
    db.idByIdempotencyKey.delete(idempotencyKey);
    db.idempotencyKeyById.delete(id);
  }

  return true;
}

export function resetMockWithdrawals(): void {
  const db = getDb();
  db.withdrawalsById.clear();
  db.idByIdempotencyKey.clear();
  db.idempotencyKeyById.clear();
}
