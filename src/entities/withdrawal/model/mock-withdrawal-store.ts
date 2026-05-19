import {
  getDefaultSystemUserId,
  readSystemDb,
  resetSystemDb,
  withSystemDb
} from '@/shared/mock/system-db';
import type { Withdrawal } from '@/src/entities/withdrawal/model/types';

interface InternalCreateInput {
  amount: number;
  destination: string;
  idempotencyKey: string;
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
  return withSystemDb((db) => {
    const existingId = db.withdrawals.find(
      (item) => item.idempotency_key === input.idempotencyKey
    )?.id;
    if (existingId) {
      throw new DuplicateIdempotencyError();
    }

    const createdAt = new Date().toISOString();
    const withdrawal: Withdrawal = {
      id: createWithdrawalId(),
      amount: input.amount,
      destination: input.destination,
      status: 'pending',
      created_at: createdAt
    };

    db.withdrawals.push({
      ...withdrawal,
      user_id: getDefaultSystemUserId(),
      idempotency_key: input.idempotencyKey
    });

    const ticketId = `t_${globalThis.crypto.randomUUID()}`;
    db.tickets.push({
      id: ticketId,
      user_id: getDefaultSystemUserId(),
      withdrawal_id: withdrawal.id,
      subject: `Withdrawal ${withdrawal.id}`,
      status: 'open',
      support_state: 'active',
      assigned_staff_id: null,
      assigned_staff_username: null,
      last_activity_at: createdAt,
      created_at: createdAt,
      updated_at: createdAt
    });
    db.messages.push({
      id: `m_${globalThis.crypto.randomUUID()}`,
      ticket_id: ticketId,
      sender_role: 'user',
      sender_name: 'demo',
      text: `Created withdrawal request for ${input.amount} to ${input.destination}`,
      reply_to_message_id: null,
      created_at: createdAt
    });

    return withdrawal;
  });
}

export function getWithdrawalById(id: string): Withdrawal | null {
  return readSystemDb((db) => {
    const withdrawal = db.withdrawals.find((item) => item.id === id);
    if (!withdrawal) {
      return null;
    }

    return {
      id: withdrawal.id,
      amount: withdrawal.amount,
      destination: withdrawal.destination,
      status: withdrawal.status,
      created_at: withdrawal.created_at
    };
  });
}

function listWithdrawalsSorted(): Withdrawal[] {
  return readSystemDb((db) =>
    db.withdrawals
      .map((item) => ({
        id: item.id,
        amount: item.amount,
        destination: item.destination,
        status: item.status,
        created_at: item.created_at
      }))
      .sort((left, right) => {
        const timeDiff = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
        if (timeDiff !== 0) {
          return timeDiff;
        }

        return right.id.localeCompare(left.id);
      })
  );
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
  return withSystemDb((db) => {
    const previousLength = db.withdrawals.length;
    db.withdrawals = db.withdrawals.filter((item) => item.id !== id);
    if (db.withdrawals.length === previousLength) {
      return false;
    }

    const relatedTicketIds = db.tickets.filter((ticket) => ticket.withdrawal_id === id).map((ticket) => ticket.id);
    if (relatedTicketIds.length > 0) {
      db.tickets = db.tickets.filter((ticket) => !relatedTicketIds.includes(ticket.id));
      db.messages = db.messages.filter((message) => !relatedTicketIds.includes(message.ticket_id));
    }

    return true;
  });
}

export function resetMockWithdrawals(): void {
  resetSystemDb();
}
