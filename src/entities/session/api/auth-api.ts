import {
  isApiNetworkError,
  request
} from '@/src/shared/api/http-client';
import { AuthApiRoute } from '@/src/shared/config/urls';
import { translate } from '@/src/shared/i18n/client';

interface LoginPayload {
  username: string;
  password: string;
}

interface ApiErrorPayload {
  message?: string;
}

export interface LoginError {
  status: number;
  message: string;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (response.status === 401) {
      return translate('login.errors.failed');
    }

    return payload.message || translate('withdraw.error.fallback');
  } catch {
    return translate('withdraw.error.fallback');
  }
}

export async function login(payload: LoginPayload): Promise<void> {
  const response = await request(AuthApiRoute.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw {
      status: response.status,
      message: await parseErrorMessage(response)
    } satisfies LoginError;
  }
}

export async function logout(): Promise<void> {
  try {
    await request(AuthApiRoute.LOGOUT, { method: 'POST' });
  } catch (error) {
    if (isApiNetworkError(error)) {
      return;
    }
    throw error;
  }
}
