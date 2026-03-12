import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  postWithdrawal,
  type WithdrawApiError,
  type WithdrawNetworkError
} from '@/src/entities/withdrawal/api/withdrawals-api';
import type { CreateWithdrawalRequest, Withdrawal } from '@/src/entities/withdrawal/model/types';
import { WithdrawRequestStatus } from '@/src/features/withdraw/create/model/request-status';
import { translate } from '@/src/shared/i18n/client';

const FORM_STORAGE_KEY = 'withdraw:form:v1';

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
  submitWithdrawal: () => Promise<Withdrawal | null>;
  retryLastRequest: () => Promise<Withdrawal | null>;
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
    return translate('withdraw.error.network');
  }

  if (isWithdrawApiError(error) && error.status === 409) {
    return translate('withdraw.error.conflict');
  }

  if (isWithdrawApiError(error) && error.status === 401) {
    return translate('withdraw.error.unauthorized');
  }

  if (isWithdrawApiError(error)) {
    return error.message || translate('withdraw.error.fallback');
  }

  return translate('withdraw.error.unknown');
}

async function executeSubmit(
  payload: CreateWithdrawalRequest,
  set: (partial: Partial<WithdrawState>) => void
): Promise<Withdrawal | null> {
  set({ status: WithdrawRequestStatus.LOADING, errorMessage: null, lastRequest: { payload } });

  try {
    const created = await postWithdrawal(payload);
    set({
      status: WithdrawRequestStatus.SUCCESS,
      errorMessage: null,
      withdrawal: created
    });
    return created;
  } catch (error) {
    set({
      status: WithdrawRequestStatus.ERROR,
      errorMessage: toHumanErrorMessage(error)
    });
    return null;
  }
}

function createWithdrawStoreInternal() {
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

          return executeSubmit(payload, set);
        },
        retryLastRequest: async () => {
          const state = get();

          if (state.status === WithdrawRequestStatus.LOADING || !state.lastRequest) {
            return null;
          }

          return executeSubmit(state.lastRequest.payload, set);
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

export const useWithdrawStore = createWithdrawStoreInternal();

export function resetWithdrawStore(): void {
  useWithdrawStore.persist.clearStorage();
  useWithdrawStore.getState().reset();
}
