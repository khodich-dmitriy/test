# Withdraw Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up the withdraw flow by removing dead state, decomposing the overloaded feed component, and reducing duplication in the withdrawals client/server layers.

**Architecture:** Keep behavior unchanged while splitting the withdraw feed into focused units: constants, item rendering, delete confirmation modal, and a dedicated hook for feed state. Remove stale persisted-success logic from the withdraw store so the feed remains the only source of truth for list visibility.

**Tech Stack:** Next.js App Router, React, Zustand, TypeScript, Vitest

---

### Task 1: Lock current withdraw behavior with existing tests

**Files:**
- Test: `tests/withdraw-page.test.tsx`
- Test: `tests/withdraw-feed-api.test.ts`
- Test: `tests/withdraw-details-page.test.tsx`

**Step 1: Run focused tests**

Run: `npm test -- tests/withdraw-page.test.tsx tests/withdraw-feed-api.test.ts tests/withdraw-details-page.test.tsx`
Expected: PASS before refactor.

### Task 2: Remove dead withdraw-store state

**Files:**
- Modify: `src/features/withdraw/create/model/withdraw-store.ts`

**Step 1: Delete stale persisted-success logic**

Remove:
- `restoreLatestWithdrawal`
- sessionStorage success persistence helpers
- unused time-based recovery code

**Step 2: Keep form persistence only**

Retain the form draft persistence already used by the page.

### Task 3: Decompose the withdraw feed

**Files:**
- Modify: `src/features/withdraw/feed/ui/withdraw-feed.tsx`
- Create: `src/features/withdraw/feed/ui/withdraw-feed.constants.ts`
- Create: `src/features/withdraw/feed/ui/withdraw-feed-item.tsx`
- Create: `src/features/withdraw/feed/ui/delete-withdrawal-modal.tsx`
- Create: `src/features/withdraw/feed/model/use-withdraw-feed.ts`

**Step 1: Extract constants**

Move virtualization and paging constants out of the component.

**Step 2: Extract feed state hook**

Move loading, pagination, prepend, delete, and modal state into a dedicated hook.

**Step 3: Extract presentational pieces**

Move the feed item row and delete modal into focused components.

### Task 4: Reduce API duplication

**Files:**
- Modify: `src/entities/withdrawal/api/withdrawals-api.ts`
- Modify: `src/app/api/withdrawals/create-withdrawal-handler.ts`
- Modify: `src/app/api/withdrawals/delete-withdrawal-handler.ts`
- Modify: `src/app/api/withdrawals/get-withdrawal-by-id-handler.ts`
- Modify: `src/app/api/withdrawals/list-withdrawals-feed-handler.ts`

**Step 1: Simplify shared request handling**

Reduce repeated response/error mapping while keeping public APIs stable.

**Step 2: Align server handlers**

Use a consistent structure for auth checks and response exits.

### Task 5: Verify

**Files:**
- Test: `tests/withdraw-page.test.tsx`
- Test: `tests/withdraw-feed-api.test.ts`
- Test: `tests/withdraw-details-page.test.tsx`
- Test: `tests/auth-guards.test.ts`

**Step 1: Run focused regression tests**

Run: `npm test -- tests/withdraw-page.test.tsx tests/withdraw-feed-api.test.ts tests/withdraw-details-page.test.tsx tests/auth-guards.test.ts`
Expected: PASS
