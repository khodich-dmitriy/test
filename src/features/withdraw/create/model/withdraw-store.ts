import { create } from 'zustand';

import {
  postWithdrawal,
  WithdrawApiError,
  WithdrawNetworkError
} from '@/src/entities/withdrawal/api/withdrawals-api';
import type { CreateWithdrawalRequest, Withdrawal } from '@/src/entities/withdrawal/model/types';

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

const STORAGE_KEY = 'withdraw:last-success:v1';
const FIVE_MINUTES_MS = 5 * 60 * 1000;

interface PersistedSuccess {
  timestamp: number;
  withdrawal: Withdrawal;
}

interface LastRequest {
  payload: CreateWithdrawalRequest;
}

interface WithdrawState {
  amount: string;
  destination: string;
  confirm: boolean;
  status: RequestStatus;
  errorMessage: string | null;
  withdrawal: Withdrawal | null;
  lastRequest: LastRequest | null;
  setAmount: (value: string) => void;
  setDestination: (value: string) => void;
  setConfirm: (value: boolean) => void;
  canSubmit: () => boolean;
  submitWithdrawal: () => Promise<string | null>;
  retryLastRequest: () => Promise<string | null>;
  restoreLatestWithdrawal: () => void;
  reset: () => void;
}

const initialState = {
  amount: '',
  destination: '',
  confirm: false,
  status: 'idle' as RequestStatus,
  errorMessage: null,
  withdrawal: null,
  lastRequest: null
};

function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

function normalizeAmount(value: string): number {
  return Number(value);
}

function isFormValid(state: Pick<WithdrawState, 'amount' | 'destination' | 'confirm'>): boolean {
  const amount = normalizeAmount(state.amount);
  return (
    Number.isFinite(amount) && amount > 0 && state.destination.trim().length > 0 && state.confirm
  );
}

function toHumanErrorMessage(error: unknown): string {
  if (error instanceof WithdrawNetworkError) {
    return 'Network error. Please check your connection and retry.';
  }

  if (error instanceof WithdrawApiError && error.status === 409) {
    return 'Request conflict: a withdrawal with this idempotency key already exists.';
  }

  if (error instanceof WithdrawApiError && error.status === 401) {
    return 'Session expired. Please sign in again.';
  }

  if (error instanceof WithdrawApiError) {
    return error.message || 'Request failed.';
  }

  return 'Unexpected error. Please retry.';
}

function persistSuccess(withdrawal: Withdrawal, now: number): void {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: PersistedSuccess = { timestamp: now, withdrawal };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadPersistedSuccess(now: number): Withdrawal | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedSuccess;
    if (now - parsed.timestamp > FIVE_MINUTES_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed.withdrawal;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

async function executeSubmit(
  payload: CreateWithdrawalRequest,
  set: (partial: Partial<WithdrawState>) => void,
  nowProvider: () => number
): Promise<string | null> {
  set({ status: 'loading', errorMessage: null, lastRequest: { payload } });

  try {
    const created = await postWithdrawal(payload);
    persistSuccess(created, nowProvider());

    set({
      status: 'success',
      errorMessage: null,
      withdrawal: created
    });
    return created.id;
  } catch (error) {
    set({
      status: 'error',
      errorMessage: toHumanErrorMessage(error)
    });
    return null;
  }
}

function createWithdrawStoreInternal(nowProvider: () => number) {
  return create<WithdrawState>((set, get) => ({
    ...initialState,
    setAmount: (value) => set({ amount: value }),
    setDestination: (value) => set({ destination: value }),
    setConfirm: (value) => set({ confirm: value }),
    canSubmit: () => {
      const state = get();
      return state.status !== 'loading' && isFormValid(state);
    },
    submitWithdrawal: async () => {
      const state = get();

      if (state.status === 'loading' || !isFormValid(state)) {
        return null;
      }

      const payload: CreateWithdrawalRequest = {
        amount: normalizeAmount(state.amount),
        destination: state.destination.trim(),
        idempotency_key: generateIdempotencyKey()
      };

      return executeSubmit(payload, set, nowProvider);
    },
    retryLastRequest: async () => {
      const state = get();

      if (state.status === 'loading' || !state.lastRequest) {
        return null;
      }

      return executeSubmit(state.lastRequest.payload, set, nowProvider);
    },
    restoreLatestWithdrawal: () => {
      const restored = loadPersistedSuccess(nowProvider());
      if (restored) {
        set({ status: 'success', withdrawal: restored, errorMessage: null });
      }
    },
    reset: () => set(initialState)
  }));
}

export const useWithdrawStore = createWithdrawStoreInternal(() => Date.now());

export function resetWithdrawStore(): void {
  useWithdrawStore.getState().reset();
}
