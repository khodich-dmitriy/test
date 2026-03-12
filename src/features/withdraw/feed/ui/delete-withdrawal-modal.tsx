import { useTranslation } from 'react-i18next';

import type { Withdrawal } from '@/src/entities/withdrawal/model/types';
import styles from '@/src/features/withdraw/feed/ui/withdraw-feed.module.css';
import { WithdrawFeedTestId } from '@/src/shared/config/test-ids';
import Button from '@/src/shared/ui/button/button';
import Heading from '@/src/shared/ui/typography/heading';
import Text from '@/src/shared/ui/typography/text';

interface DeleteWithdrawalModalProps {
  withdrawal: Withdrawal;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteWithdrawalModal({
  withdrawal,
  isDeleting,
  onCancel,
  onConfirm
}: DeleteWithdrawalModalProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.modalBackdrop}>
      <div
        aria-labelledby="delete-withdrawal-title"
        aria-modal="true"
        className={styles.modalCard}
        data-testid={WithdrawFeedTestId.DIALOG}
        role="dialog"
      >
        <Heading as="h3" className={styles.modalTitle} id="delete-withdrawal-title">
          {t('withdraw.feed.modalTitle')}
        </Heading>
        <Text className={styles.modalText} variant="body">
          {t('withdraw.feed.modalText', { id: withdrawal.id })}
        </Text>
        <div className={styles.modalActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            data-testid={WithdrawFeedTestId.DIALOG_CANCEL}
          >
            {t('withdraw.feed.modalCancel')}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid={WithdrawFeedTestId.DIALOG_DELETE}
          >
            {isDeleting ? t('withdraw.feed.modalDeleting') : t('withdraw.feed.modalDelete')}
          </Button>
        </div>
      </div>
    </div>
  );
}
