'use client';

import { useState } from 'react';

import type { Withdrawal } from '@/src/entities/withdrawal/model/types';
import WithdrawForm from '@/src/features/withdraw/create/ui/withdraw-form';
import WithdrawFeed from '@/src/features/withdraw/feed/ui/withdraw-feed';
import styles from '@/src/views/withdraw/ui/withdraw-page.module.css';

export default function WithdrawPage() {
  const [latestCreated, setLatestCreated] = useState<Withdrawal | null>(null);

  return (
    <main className={styles.page}>
      <div className={styles.stack}>
        <WithdrawForm onCreated={setLatestCreated} />
        <WithdrawFeed latestCreated={latestCreated} />
      </div>
    </main>
  );
}
