import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '@/app/(public)/login/page';
import { login } from '@/src/entities/session/api/auth-api';
import { LoginTestId } from '@/src/shared/config/test-ids';
import { AppRoute } from '@/src/shared/config/urls';

const pushMock = vi.fn();
const refreshMock = vi.fn();
const getSearchParamsMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock
  }),
  useSearchParams: () => getSearchParamsMock()
}));

vi.mock('@/src/entities/session/api/auth-api', () => ({
  login: vi.fn()
}));

describe('страница логина', () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    getSearchParamsMock.mockReset();
    getSearchParamsMock.mockReturnValue(new URLSearchParams());
    vi.mocked(login).mockReset();
  });

  it('после успешного логина переходит на redirectTo если он передан', async () => {
    vi.mocked(login).mockResolvedValue(undefined);
    getSearchParamsMock.mockReturnValue(new URLSearchParams('redirectTo=%2Fwithdraw%2Fw_1%3Ftab%3Dhistory'));

    render(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId(LoginTestId.USERNAME_INPUT), 'demo');
    await user.type(screen.getByTestId(LoginTestId.PASSWORD_INPUT), 'demo123');
    await user.click(screen.getByTestId(LoginTestId.SUBMIT_BUTTON));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ username: 'demo', password: 'demo123' });
      expect(pushMock).toHaveBeenCalledWith('/withdraw/w_1?tab=history');
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it('после успешного логина переходит на withdraw если redirectTo отсутствует', async () => {
    vi.mocked(login).mockResolvedValue(undefined);

    render(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId(LoginTestId.USERNAME_INPUT), 'demo');
    await user.type(screen.getByTestId(LoginTestId.PASSWORD_INPUT), 'demo123');
    await user.click(screen.getByTestId(LoginTestId.SUBMIT_BUTTON));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ username: 'demo', password: 'demo123' });
      expect(pushMock).toHaveBeenCalledWith(AppRoute.WITHDRAW);
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it('игнорирует небезопасный redirectTo и переходит на withdraw', async () => {
    vi.mocked(login).mockResolvedValue(undefined);
    getSearchParamsMock.mockReturnValue(new URLSearchParams('redirectTo=https%3A%2F%2Fevil.test'));

    render(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId(LoginTestId.USERNAME_INPUT), 'demo');
    await user.type(screen.getByTestId(LoginTestId.PASSWORD_INPUT), 'demo123');
    await user.click(screen.getByTestId(LoginTestId.SUBMIT_BUTTON));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(AppRoute.WITHDRAW);
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
