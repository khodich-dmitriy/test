export enum AppLanguage {
  RU = 'ru',
  EN = 'en',
  ZH = 'zh'
}

export const DEFAULT_APP_LANGUAGE = AppLanguage.RU;
export const LANGUAGE_COOKIE_NAME = 'app_language';
const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LANGUAGE_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  maxAge: LANGUAGE_COOKIE_MAX_AGE
};

export const APP_LANGUAGE_OPTIONS = [
  { value: AppLanguage.RU, label: 'Русский' },
  { value: AppLanguage.EN, label: 'English' },
  { value: AppLanguage.ZH, label: '中文' }
] as const;

export function isAppLanguage(value: string): value is AppLanguage {
  return Object.values(AppLanguage).includes(value as AppLanguage);
}

export function resolveAppLanguage(value: string | null | undefined): AppLanguage {
  if (!value) {
    return DEFAULT_APP_LANGUAGE;
  }

  return isAppLanguage(value) ? value : DEFAULT_APP_LANGUAGE;
}

export function createLanguageCookie(language: AppLanguage): string {
  const secure = process.env.NODE_ENV === 'production' ? '; secure' : '';

  return `${LANGUAGE_COOKIE_NAME}=${language}; path=${LANGUAGE_COOKIE_OPTIONS.path}; max-age=${LANGUAGE_COOKIE_OPTIONS.maxAge}; samesite=${LANGUAGE_COOKIE_OPTIONS.sameSite}${secure}`;
}
