'use client';

import { useEffect, useRef, useState } from 'react';

import {
  fetchWithdrawalsFeed,
  removeWithdrawal,
  type WithdrawApiError
} from '@/src/entities/withdrawal/api/withdrawals-api';
import type { Withdrawal } from '@/src/entities/withdrawal/model/types';
import {
  WITHDRAW_FEED_LOAD_MORE_THRESHOLD,
  WITHDRAW_FEED_PAGE_SIZE
} from '@/src/features/withdraw/feed/ui/withdraw-feed.constants';
import { translate } from '@/src/shared/i18n/client';

function toErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    (error as Partial<WithdrawApiError>).kind === 'http'
  ) {
    return (error as WithdrawApiError).message || translate('withdraw.error.fallback');
  }

  return translate('withdraw.error.network');
}

function mergeUniqueById(current: Withdrawal[], next: Withdrawal[]): Withdrawal[] {
  return [...current, ...next.filter((item) => !current.some((saved) => saved.id === item.id))];
}

const LOAD_MORE_SKELETON_MIN_DURATION_MS = 180;

export function useWithdrawFeed(latestCreated: Withdrawal | null) {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Withdrawal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadMoreSkeletonVisible, setIsLoadMoreSkeletonVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const loadMoreSkeletonTimeoutRef = useRef<number | null>(null);
  const initialLoadPromiseRef = useRef<Promise<Awaited<ReturnType<typeof fetchWithdrawalsFeed>>> | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (loadMoreSkeletonTimeoutRef.current !== null) {
        window.clearTimeout(loadMoreSkeletonTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setIsInitialLoading(true);
      setErrorMessage(null);

      try {
        if (!initialLoadPromiseRef.current) {
          initialLoadPromiseRef.current = fetchWithdrawalsFeed(null, WITHDRAW_FEED_PAGE_SIZE);
        }

        const response = await initialLoadPromiseRef.current;
        if (cancelled) {
          return;
        }

        setItems(response.items);
        setNextCursor(response.nextCursor);
        setHasMore(response.hasMore);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(toErrorMessage(error));
        }
      } finally {
        initialLoadPromiseRef.current = null;
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!latestCreated) {
      return;
    }

    setItems((current) => {
      const rest = current.filter((item) => item.id !== latestCreated.id);
      return [latestCreated, ...rest];
    });
  }, [latestCreated]);

  const loadMore = async (container: HTMLDivElement) => {
    setScrollTop(container.scrollTop);

    if (
      isInitialLoading ||
      isLoadingMore ||
      !hasMore ||
      !nextCursor ||
      container.scrollHeight - container.scrollTop - container.clientHeight >
        WITHDRAW_FEED_LOAD_MORE_THRESHOLD
    ) {
      return;
    }

    setIsLoadingMore(true);
    setIsLoadMoreSkeletonVisible(true);
    setErrorMessage(null);
    const startedAt = Date.now();

    try {
      const response = await fetchWithdrawalsFeed(nextCursor, WITHDRAW_FEED_PAGE_SIZE);
      setItems((current) => mergeUniqueById(current, response.items));
      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsLoadingMore(false);
      if (loadMoreSkeletonTimeoutRef.current !== null) {
        window.clearTimeout(loadMoreSkeletonTimeoutRef.current);
      }
      const remainingDelay = Math.max(
        0,
        LOAD_MORE_SKELETON_MIN_DURATION_MS - (Date.now() - startedAt)
      );
      loadMoreSkeletonTimeoutRef.current = window.setTimeout(() => {
        setIsLoadMoreSkeletonVisible(false);
        loadMoreSkeletonTimeoutRef.current = null;
      }, remainingDelay);
    }
  };

  const confirmDelete = (item: Withdrawal) => {
    setPendingDelete(item);
  };

  const cancelDelete = () => {
    if (isDeleting) {
      return;
    }

    setPendingDelete(null);
  };

  const deletePending = async () => {
    if (!pendingDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await removeWithdrawal(pendingDelete.id);
      setItems((current) => current.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    items,
    pendingDelete,
    isDeleting,
    isInitialLoading,
    isLoadingMore,
    isLoadMoreSkeletonVisible,
    hasMore,
    errorMessage,
    scrollTop,
    loadMore,
    confirmDelete,
    cancelDelete,
    deletePending
  };
}
