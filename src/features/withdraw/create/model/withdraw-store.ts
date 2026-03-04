import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  postWithdrawal,
  type WithdrawApiError,
  type WithdrawNetworkError
} from '@/src/entities/withdrawal/api/withdrawals-api';
import type { CreateWithdrawalRequest, Withdrawal } from '@/src/entities/withdrawal/model/types';
import { WithdrawRequestStatus } from '@/src/features/withdraw/create/model/request-status';

const STORAGE_KEY = 'withdraw:last-success:v1';
const FORM_STORAGE_KEY = 'withdraw:form:v1';
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
  status: WithdrawRequestStatus;
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
  status: WithdrawRequestStatus.IDLE,
  errorMessage: null,
  withdrawal: null,
  lastRequest: null
};

function isWithdrawNetworkError(error: unknown): error is WithdrawNetworkError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Partial<WithdrawNetworkError>).kind === 'network'
  );
}

function isWithdrawApiError(error: unknown): error is WithdrawApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Partial<WithdrawApiError>).kind === 'http'
  );
}

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
  if (isWithdrawNetworkError(error)) {
    return 'Network error. Please check your connection and retry.';
  }

  if (isWithdrawApiError(error) && error.status === 409) {
    return 'Request conflict: a withdrawal with this idempotency key already exists.';
  }

  if (isWithdrawApiError(error) && error.status === 401) {
    return 'Session expired. Please sign in again.';
  }

  if (isWithdrawApiError(error)) {
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
  set({ status: WithdrawRequestStatus.LOADING, errorMessage: null, lastRequest: { payload } });

  try {
    const created = await postWithdrawal(payload);
    persistSuccess(created, nowProvider());

    set({
      status: WithdrawRequestStatus.SUCCESS,
      errorMessage: null,
      withdrawal: created
    });
    return created.id;
  } catch (error) {
    set({
      status: WithdrawRequestStatus.ERROR,
      errorMessage: toHumanErrorMessage(error)
    });
    return null;
  }
}

function createWithdrawStoreInternal(nowProvider: () => number) {
  return create<WithdrawState>()(
    persist(
      (set, get) => ({
        ...initialState,
        setAmount: (value) => set({ amount: value }),
        setDestination: (value) => set({ destination: value }),
        setConfirm: (value) => set({ confirm: value }),
        canSubmit: () => {
          const state = get();
          return state.status !== WithdrawRequestStatus.LOADING && isFormValid(state);
        },
        submitWithdrawal: async () => {
          const state = get();

          if (state.status === WithdrawRequestStatus.LOADING || !isFormValid(state)) {
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

          if (state.status === WithdrawRequestStatus.LOADING || !state.lastRequest) {
            return null;
          }

          return executeSubmit(state.lastRequest.payload, set, nowProvider);
        },
        restoreLatestWithdrawal: () => {
          const restored = loadPersistedSuccess(nowProvider());
          if (restored) {
            set({ status: WithdrawRequestStatus.SUCCESS, withdrawal: restored, errorMessage: null });
          }
        },
        reset: () => set(initialState)
      }),
      {
        name: FORM_STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          amount: state.amount,
          destination: state.destination,
          confirm: state.confirm
        })
      }
    )
  );
}

export const useWithdrawStore = createWithdrawStoreInternal(() => Date.now());

export function resetWithdrawStore(): void {
  useWithdrawStore.persist.clearStorage();
  useWithdrawStore.getState().reset();
}
