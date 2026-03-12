'use client';

import { useTranslation } from 'react-i18next';

import { formatDateTime, formatUsdtAmount } from '@/src/entities/withdrawal/lib/formatters';
import type { Withdrawal } from '@/src/entities/withdrawal/model/types';
import StatusChip from '@/src/entities/withdrawal/ui/status-chip/status-chip';
import { WithdrawDetailsTestId } from '@/src/shared/config/test-ids';
import { resolveAppLanguage } from '@/src/shared/i18n/config';
import styles from '@/src/views/withdraw-details/ui/withdraw-details-page.module.css';

export default function WithdrawDetailsPage({ withdrawal }: { withdrawal: Withdrawal | null }) {
  const { t, i18n } = useTranslation();
  const currentLanguage = resolveAppLanguage(i18n.resolvedLanguage);

  if (!withdrawal) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1 className={styles.title}>{t('withdraw.details.title')}</h1>
          <p className={styles.notFound} data-testid={WithdrawDetailsTestId.NOT_FOUND}>
            {t('withdraw.details.notFound')}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>{t('withdraw.details.title')}</h1>
        <p className={styles.row} data-testid={WithdrawDetailsTestId.ID}>
          ID: {withdrawal.id}
        </p>
        <p className={styles.rowStrong} data-testid={WithdrawDetailsTestId.AMOUNT}>
          {t('withdraw.details.amount', {
            amount: formatUsdtAmount(withdrawal.amount, currentLanguage)
          })}
        </p>
        <p className={styles.row}>
          {t('withdraw.details.destination', { destination: withdrawal.destination })}
        </p>

        <div className={styles.statusLine}>
          <span>{t('withdraw.details.status')}</span>
          <div data-testid={WithdrawDetailsTestId.STATUS}>
            <StatusChip status={withdrawal.status} />
          </div>
        </div>

        <div className={styles.muted}>
          <p className={styles.mutedRow}>
            {t('withdraw.details.createdAt', {
              value: formatDateTime(withdrawal.created_at, currentLanguage)
            })}
          </p>
          <p className={styles.mutedRow} data-testid={WithdrawDetailsTestId.NETWORK}>
            {t('withdraw.details.network')}
          </p>
          <p className={styles.mutedRow}>{t('withdraw.details.settlement')}</p>
        </div>
      </section>
    </main>
  );
}
