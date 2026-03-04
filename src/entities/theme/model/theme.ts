export enum AppTheme {
  FINTECH_LIGHT = 'fintech-light',
  OCEAN_BREEZE = 'ocean-breeze',
  MINT_GLASS = 'mint-glass'
}

export const THEME_COOKIE_NAME = 'app_theme';
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEME_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  maxAge: THEME_COOKIE_MAX_AGE
};

export interface ThemeOption {
  value: AppTheme;
  label: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { value: AppTheme.FINTECH_LIGHT, label: 'Fintech Light' },
  { value: AppTheme.OCEAN_BREEZE, label: 'Ocean Breeze' },
  { value: AppTheme.MINT_GLASS, label: 'Mint Glass' }
];

export function isAppTheme(value: string): value is AppTheme {
  return Object.values(AppTheme).includes(value as AppTheme);
}

export function resolveAppTheme(value: string | null | undefined): AppTheme {
  if (!value) {
    return AppTheme.FINTECH_LIGHT;
  }

  return isAppTheme(value) ? value : AppTheme.FINTECH_LIGHT;
}

export function createThemeCookie(theme: AppTheme): string {
  const secure = process.env.NODE_ENV === 'production' ? '; secure' : '';
  return `${THEME_COOKIE_NAME}=${theme}; path=${THEME_COOKIE_OPTIONS.path}; max-age=${THEME_COOKIE_OPTIONS.maxAge}; samesite=${THEME_COOKIE_OPTIONS.sameSite}${secure}`;
}
