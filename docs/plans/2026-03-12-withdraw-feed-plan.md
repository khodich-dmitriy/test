# Withdraw Feed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a virtualized, cursor-paginated withdrawals feed with deletion to the `/withdraw` page while keeping the creation form at the top.

**Architecture:** Extend the mock withdrawal store with sorted feed and delete operations, expose them via dedicated API handlers, and build a client-side feed component that owns infinite loading, virtualization, and optimistic updates for create/delete events.

**Tech Stack:** Next.js App Router, TypeScript, Zustand, Vitest, Testing Library

---

### Task 1: Lock API behavior with tests

**Files:**
- Create: `tests/withdraw-feed-api.test.ts`

**Step 1: Write failing tests**

Cover:

- newest-first ordering
- `cursor` returns the next page after the referenced item
- delete removes the item and `GET by id` then returns `404`

**Step 2: Run tests**

Run: `npm test -- tests/withdraw-feed-api.test.ts`
Expected: FAIL until the API and store are extended.

### Task 2: Lock page behavior with tests

**Files:**
- Modify: `tests/withdraw-page.test.tsx`

**Step 1: Write failing tests**

Cover:

- feed loads on page render
- create keeps the user on `/withdraw` and prepends the new item
- delete asks for confirmation and removes the item
- loading more appends older items

**Step 2: Run tests**

Run: `npm test -- tests/withdraw-page.test.tsx`
Expected: FAIL until the new component tree is implemented.

### Task 3: Implement API and store

**Files:**
- Modify: `src/entities/withdrawal/model/types.ts`
- Modify: `src/entities/withdrawal/model/mock-withdrawal-store.ts`
- Create: `src/app/api/withdrawals/list-withdrawals-feed-handler.ts`
- Create: `src/app/api/withdrawals/delete-withdrawal-handler.ts`
- Create: `app/v1/withdrawals/feed/route.ts`
- Modify: `app/v1/withdrawals/[id]/route.ts`

**Step 1: Add feed response types**

Define the paginated response shape.

**Step 2: Extend the mock store**

Add:

- list by newest first
- list feed by cursor and limit
- delete by id

**Step 3: Add handlers and routes**

Expose `GET /v1/withdrawals/feed` and `DELETE /v1/withdrawals/:id`.

### Task 4: Implement page-level feed

**Files:**
- Modify: `src/entities/withdrawal/api/withdrawals-api.ts`
- Modify: `src/shared/config/urls.ts`
- Modify: `src/shared/config/test-ids.ts`
- Modify: `src/features/withdraw/create/model/withdraw-store.ts`
- Modify: `src/features/withdraw/create/ui/withdraw-form.tsx`
- Modify: `src/features/withdraw/create/ui/withdraw-form.module.css`
- Modify: `src/views/withdraw/ui/withdraw-page.tsx`
- Create: `src/features/withdraw/feed/ui/withdraw-feed.tsx`
- Create: `src/features/withdraw/feed/ui/withdraw-feed.module.css`

**Step 1: Add client API methods**

Implement feed fetch and delete request helpers.

**Step 2: Surface newly created withdrawal in the page**

Keep the form on `/withdraw`, reset it after success, and notify the feed about the new item.

**Step 3: Build the feed component**

Handle initial load, append on demand, virtualized rendering, delete confirmation, and optimistic UI updates.

### Task 5: Verify

**Files:**
- Test: `tests/withdraw-feed-api.test.ts`
- Test: `tests/withdraw-page.test.tsx`

**Step 1: Run focused tests**

Run: `npm test -- tests/withdraw-feed-api.test.ts tests/withdraw-page.test.tsx`
Expected: PASS
