import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppTheme } from '@/src/entities/theme/model/theme';
import {
  FooterTestId,
  HeaderTestId,
  ShellTestId
} from '@/src/shared/config/test-ids';
import { AuthApiRoute } from '@/src/shared/config/urls';
import { AppLanguage } from '@/src/shared/i18n/config';
import I18nProvider from '@/src/shared/i18n/provider';
import ShellChrome from '@/src/widgets/shell/ui/shell-chrome';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}));

describe('scroll shell transparency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('activates header and footer overlay states while content is scrolled', () => {
    render(
      <I18nProvider initialLanguage={AppLanguage.RU}>
        <ShellChrome initialTheme={AppTheme.FINTECH_LIGHT} showLogout={false}>
          <div style={{ height: '2000px' }}>content</div>
        </ShellChrome>
      </I18nProvider>
    );

    const content = screen.getByTestId(ShellTestId.CONTENT);
    const header = screen.getByTestId(HeaderTestId.ROOT);
    const footer = screen.getByTestId(FooterTestId.ROOT);

    expect(content).toHaveAttribute('data-footer-overlay-active', 'false');
    expect(header).toHaveAttribute('data-overlay-active', 'false');
    expect(footer).toHaveAttribute('data-overlay-active', 'false');

    Object.defineProperty(content, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(content, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(content, 'scrollTop', { value: 120, configurable: true, writable: true });

    act(() => {
      content.dispatchEvent(new Event('scroll'));
    });

    expect(header).toHaveAttribute('data-overlay-active', 'true');
    expect(footer).toHaveAttribute('data-overlay-active', 'true');
    expect(content).toHaveAttribute('data-footer-overlay-active', 'true');
  });

  it('performs background token refresh on timer and on activity in private shell', async () => {
    render(
      <I18nProvider initialLanguage={AppLanguage.RU}>
        <ShellChrome initialTheme={AppTheme.FINTECH_LIGHT} showLogout>
          <div>content</div>
        </ShellChrome>
      </I18nProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(45_000);
    });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(AuthApiRoute.REFRESH, { method: 'POST' });

    await act(async () => {
      vi.advanceTimersByTime(30_001);
      window.dispatchEvent(new Event('focus'));
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it('does not perform background refresh in public shell', async () => {
    render(
      <I18nProvider initialLanguage={AppLanguage.RU}>
        <ShellChrome initialTheme={AppTheme.FINTECH_LIGHT} showLogout={false}>
          <div>content</div>
        </ShellChrome>
      </I18nProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(90_000);
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new MouseEvent('pointerdown'));
    });

    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('throttles refresh on rapid typing activity', async () => {
    render(
      <I18nProvider initialLanguage={AppLanguage.RU}>
        <ShellChrome initialTheme={AppTheme.FINTECH_LIGHT} showLogout>
          <div>content</div>
        </ShellChrome>
      </I18nProvider>
    );

    const fetchMock = vi.mocked(fetch);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      await Promise.resolve();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
      await Promise.resolve();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
