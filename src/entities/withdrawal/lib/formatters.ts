import { AppLanguage } from '@/src/shared/i18n/config';

const localeByLanguage: Record<AppLanguage, string> = {
  [AppLanguage.RU]: 'ru-RU',
  [AppLanguage.EN]: 'en-US',
  [AppLanguage.ZH]: 'zh-CN'
};

export function formatUsdtAmount(value: number, language: AppLanguage = AppLanguage.EN): string {
  return `${new Intl.NumberFormat(localeByLanguage[language], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)} USDT`;
}

export function formatDateTime(value: string, language: AppLanguage = AppLanguage.RU): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(localeByLanguage[language], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
