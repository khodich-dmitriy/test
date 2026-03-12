import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AppTheme } from '@/src/entities/theme/model/theme';
import { HeaderTestId, LanguageTestId } from '@/src/shared/config/test-ids';
import {
  AppLanguage,
  createLanguageCookie,
  LANGUAGE_COOKIE_NAME,
  resolveAppLanguage
} from '@/src/shared/i18n/config';
import I18nProvider from '@/src/shared/i18n/provider';
import AppHeader from '@/src/widgets/header/ui/app-header';

describe('i18n', () => {
  it('resolves russian by default and keeps valid languages', () => {
    expect(resolveAppLanguage(null)).toBe(AppLanguage.RU);
    expect(resolveAppLanguage(undefined)).toBe(AppLanguage.RU);
    expect(resolveAppLanguage('')).toBe(AppLanguage.RU);
    expect(resolveAppLanguage(AppLanguage.EN)).toBe(AppLanguage.EN);
    expect(resolveAppLanguage(AppLanguage.ZH)).toBe(AppLanguage.ZH);
    expect(resolveAppLanguage('de')).toBe(AppLanguage.RU);
  });

  it('creates language cookie', () => {
    expect(createLanguageCookie(AppLanguage.EN)).toContain(`${LANGUAGE_COOKIE_NAME}=en`);
  });

  it('renders header in english and switches to chinese with persistence', async () => {
    render(
      <I18nProvider initialLanguage={AppLanguage.EN}>
        <AppHeader initialTheme={AppTheme.FINTECH_LIGHT} showLogout={false} />
      </I18nProvider>
    );

    const user = userEvent.setup();

    expect(screen.getByTestId(HeaderTestId.BRAND)).toHaveTextContent('Withdrawals');
    expect(screen.getByTestId(LanguageTestId.SELECT)).toBeInTheDocument();

    await user.selectOptions(screen.getByTestId(LanguageTestId.SELECT), AppLanguage.ZH);

    await waitFor(() => {
      expect(screen.getByTestId(HeaderTestId.BRAND)).toHaveTextContent('提款');
    });

    expect(screen.getByTestId(LanguageTestId.SELECT)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe(AppLanguage.ZH);
    expect(document.cookie).toContain(`${LANGUAGE_COOKIE_NAME}=zh`);
  });
});
