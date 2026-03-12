import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { AppTheme } from '@/src/entities/theme/model/theme';
import {
  FooterTestId,
  HeaderTestId,
  ShellTestId
} from '@/src/shared/config/test-ids';
import { AppLanguage } from '@/src/shared/i18n/config';
import I18nProvider from '@/src/shared/i18n/provider';
import ShellChrome from '@/src/widgets/shell/ui/shell-chrome';

describe('scroll shell transparency', () => {
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
  });
});
