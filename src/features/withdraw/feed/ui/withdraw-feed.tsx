'use client';

import { useTranslation } from 'react-i18next';

import type { Withdrawal } from '@/src/entities/withdrawal/model/types';
import { useWithdrawFeed } from '@/src/features/withdraw/feed/model/use-withdraw-feed';
import DeleteWithdrawalModal from '@/src/features/withdraw/feed/ui/delete-withdrawal-modal';
import {
  WITHDRAW_FEED_ITEM_HEIGHT,
  WITHDRAW_FEED_OVERSCAN,
  WITHDRAW_FEED_VIEWPORT_HEIGHT
} from '@/src/features/withdraw/feed/ui/withdraw-feed.constants';
import styles from '@/src/features/withdraw/feed/ui/withdraw-feed.module.css';
import WithdrawFeedItem from '@/src/features/withdraw/feed/ui/withdraw-feed-item';
import { WithdrawFeedTestId } from '@/src/shared/config/test-ids';
import Heading from '@/src/shared/ui/typography/heading';
import Text from '@/src/shared/ui/typography/text';

interface WithdrawFeedProps {
  latestCreated: Withdrawal | null;
}

const INITIAL_SKELETON_COUNT = 4;
const LOAD_MORE_SKELETON_COUNT = 2;

interface WithdrawFeedSkeletonProps {
  count: number;
  testId: WithdrawFeedTestId;
}

function WithdrawFeedSkeleton({ count, testId }: WithdrawFeedSkeletonProps) {
  return (
    <div className={styles.skeletonList} data-testid={testId}>
      {Array.from({ length: count }, (_, index) => (
        <div className={styles.skeletonItem} key={index}>
          <div className={styles.skeletonMain}>
            <span className={styles.skeletonLine} />
            <span className={`${styles.skeletonLine} ${styles.skeletonLineWide}`} />
            <div className={styles.skeletonMeta}>
              <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
            </div>
          </div>
          <div className={styles.skeletonActions}>
            <span className={`${styles.skeletonLine} ${styles.skeletonButton}`} />
            <span className={`${styles.skeletonLine} ${styles.skeletonButtonSecondary}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WithdrawFeed({ latestCreated }: WithdrawFeedProps) {
  const { t } = useTranslation();
  const {
    items,
    pendingDelete,
    isDeleting,
    isInitialLoading,
    isLoadMoreSkeletonVisible,
    hasMore,
    errorMessage,
    scrollTop,
    loadMore,
    confirmDelete,
    cancelDelete,
    deletePending
  } = useWithdrawFeed(latestCreated);

  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / WITHDRAW_FEED_ITEM_HEIGHT) - WITHDRAW_FEED_OVERSCAN
  );
  const visibleCount =
    Math.ceil(WITHDRAW_FEED_VIEWPORT_HEIGHT / WITHDRAW_FEED_ITEM_HEIGHT) +
    WITHDRAW_FEED_OVERSCAN * 2;
  const visibleItems = items.slice(startIndex, startIndex + visibleCount);

  if (!isInitialLoading && items.length === 0 && !errorMessage) {
    return null;
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <Heading as="h2" className={styles.title}>
          {t('withdraw.feed.title')}
        </Heading>
      </div>
      <Text className={styles.meta} variant="meta">
        {t('withdraw.feed.text')}
      </Text>

      {isInitialLoading ? (
        <div
          aria-label={t('withdraw.feed.loading')}
          className={`${styles.viewport} ${styles.skeletonViewport}`}
        >
          <WithdrawFeedSkeleton
            count={INITIAL_SKELETON_COUNT}
            testId={WithdrawFeedTestId.INITIAL_SKELETON}
          />
        </div>
      ) : (
        <div
          aria-label={t('withdraw.feed.region')}
          className={styles.viewport}
          data-testid={WithdrawFeedTestId.REGION}
          onScroll={(event) => {
            void loadMore(event.currentTarget);
          }}
          role="region"
        >
          <div
            className={styles.spacer}
            style={{ height: `${items.length * WITHDRAW_FEED_ITEM_HEIGHT}px` }}
          >
            {visibleItems.map((item, index) => {
              const absoluteIndex = startIndex + index;
              return (
                <WithdrawFeedItem
                  item={item}
                  key={item.id}
                  onDelete={confirmDelete}
                  top={absoluteIndex * WITHDRAW_FEED_ITEM_HEIGHT}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.footer}>
        {errorMessage && (
          <Text className={styles.error} variant="error">
            {errorMessage}
          </Text>
        )}
        {!isInitialLoading && items.length === 0 && !errorMessage && (
          <Text className={styles.empty} variant="muted">
            {t('withdraw.feed.empty')}
          </Text>
        )}
        {!isInitialLoading && isLoadMoreSkeletonVisible && (
          <WithdrawFeedSkeleton
            count={LOAD_MORE_SKELETON_COUNT}
            testId={WithdrawFeedTestId.LOAD_MORE_SKELETON}
          />
        )}
        {!isInitialLoading && !isLoadMoreSkeletonVisible && !hasMore && items.length > 0 && (
          <Text className={styles.end} variant="muted">
            {t('withdraw.feed.end')}
          </Text>
        )}
      </div>

      {pendingDelete && (
        <DeleteWithdrawalModal
          isDeleting={isDeleting}
          onCancel={cancelDelete}
          onConfirm={() => {
            void deletePending();
          }}
          withdrawal={pendingDelete}
        />
      )}
    </section>
  );
}
