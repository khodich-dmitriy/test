import type { WithdrawalStatus } from '@/src/entities/withdrawal/model/types';
import styles from '@/src/entities/withdrawal/ui/status-chip/status-chip.module.css';

const labelByStatus: Record<WithdrawalStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed'
};

export default function StatusChip({ status }: { status: WithdrawalStatus }) {
  return <span className={`${styles.chip} ${styles[status]}`}>{labelByStatus[status]}</span>;
}
