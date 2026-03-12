import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { formatDateTime, formatUsdtAmount } from '@/src/entities/withdrawal/lib/formatters';
import type { Withdrawal } from '@/src/entities/withdrawal/model/types';
import StatusChip from '@/src/entities/withdrawal/ui/status-chip/status-chip';
import styles from '@/src/features/withdraw/feed/ui/withdraw-feed.module.css';
import {
  getWithdrawFeedDeleteButtonTestId,
  getWithdrawFeedItemTestId
} from '@/src/shared/config/test-ids';
import { getWithdrawDetailsRoute } from '@/src/shared/config/urls';
import { resolveAppLanguage } from '@/src/shared/i18n/config';
import Button from '@/src/shared/ui/button/button';
import buttonStyles from '@/src/shared/ui/button/button.module.css';
import Heading from '@/src/shared/ui/typography/heading';
import Text from '@/src/shared/ui/typography/text';

interface WithdrawFeedItemProps {
  item: Withdrawal;
  top: number;
  onDelete: (item: Withdrawal) => void;
}

export default function WithdrawFeedItem({ item, top, onDelete }: WithdrawFeedItemProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = resolveAppLanguage(i18n.resolvedLanguage);

  return (
    <div className={styles.row} style={{ top: `${top}px` }} data-testid={getWithdrawFeedItemTestId(item.id)}>
      <article className={styles.item}>
        <div className={styles.mainInfo}>
          <Heading as="h3" className={styles.amount}>
            {formatUsdtAmount(item.amount, currentLanguage)}
          </Heading>
          <Text className={styles.destination} variant="body">
            {item.destination}
          </Text>
          <div className={styles.subline}>
            <StatusChip status={item.status} />
            <Text className={styles.metaText} variant="meta">
              {item.id}
            </Text>
            <Text className={styles.metaText} variant="meta">
              {formatDateTime(item.created_at, currentLanguage)}
            </Text>
          </div>
        </div>

        <div className={styles.actions}>
          <Link
            className={`${buttonStyles.button} ${buttonStyles.secondary}`}
            href={getWithdrawDetailsRoute(item.id)}
          >
            {t('withdraw.feed.open')}
          </Link>
          <Button
            aria-label={t('withdraw.feed.deleteLabel', { id: item.id })}
            data-testid={getWithdrawFeedDeleteButtonTestId(item.id)}
            type="button"
            variant="ghost"
            onClick={() => {
              onDelete(item);
            }}
          >
            {t('withdraw.feed.delete')}
          </Button>
        </div>
      </article>
    </div>
  );
}
