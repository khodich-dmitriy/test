'use client';

import { useTranslation } from 'react-i18next';

import type { WithdrawalStatus } from '@/src/entities/withdrawal/model/types';
import styles from '@/src/entities/withdrawal/ui/status-chip/status-chip.module.css';

export default function StatusChip({ status }: { status: WithdrawalStatus }) {
  const { t } = useTranslation();

  return (
    <span className={`${styles.chip} ${styles[status]}`}>{t(`withdraw.status.${status}`)}</span>
  );
}
