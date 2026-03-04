import { describe, expect, it } from 'vitest';

import { AppTheme, resolveAppTheme } from '@/src/entities/theme/model/theme';

describe('theme resolver', () => {
  it('returns default theme for empty input', () => {
    expect(resolveAppTheme(null)).toBe(AppTheme.FINTECH_LIGHT);
    expect(resolveAppTheme(undefined)).toBe(AppTheme.FINTECH_LIGHT);
    expect(resolveAppTheme('')).toBe(AppTheme.FINTECH_LIGHT);
  });

  it('returns selected theme for valid value', () => {
    expect(resolveAppTheme(AppTheme.OCEAN_BREEZE)).toBe(AppTheme.OCEAN_BREEZE);
  });

  it('returns default theme for unknown value', () => {
    expect(resolveAppTheme('unknown-theme')).toBe(AppTheme.FINTECH_LIGHT);
  });
});
