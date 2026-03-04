import { formatDateTime, formatUsdtAmount } from '@/src/entities/withdrawal/lib/formatters';
import { getWithdrawalById } from '@/src/entities/withdrawal/model/mock-withdrawal-store';
import StatusChip from '@/src/entities/withdrawal/ui/status-chip/status-chip';
import styles from '@/src/views/withdraw-details/ui/withdraw-details-page.module.css';

export default function WithdrawDetailsPage({ params }: { params: { id: string } }) {
  const withdrawal = getWithdrawalById(params.id);

  if (!withdrawal) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1 className={styles.title}>Withdrawal details</h1>
          <p className={styles.notFound}>Withdrawal not found</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Withdrawal details</h1>
        <p className={styles.row}>ID: {withdrawal.id}</p>
        <p className={styles.rowStrong}>Amount: {formatUsdtAmount(withdrawal.amount)}</p>
        <p className={styles.row}>Destination: {withdrawal.destination}</p>

        <div className={styles.statusLine}>
          <span>Status:</span>
          <StatusChip status={withdrawal.status} />
        </div>

        <div className={styles.muted}>
          <p className={styles.mutedRow}>Created at: {formatDateTime(withdrawal.created_at)}</p>
          <p className={styles.mutedRow}>Network: TRC20</p>
          <p className={styles.mutedRow}>Settlement window: up to 15 minutes</p>
        </div>
      </section>
    </main>
  );
}
