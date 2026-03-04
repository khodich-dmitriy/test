# Withdraw Details Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dedicated withdrawal details page and redirect flow after successful creation.

**Architecture:** Keep creation on `/withdraw`, navigate to `/withdraw/[id]` after POST success, and render details page with GET call and loading/error handling.

**Tech Stack:** Next.js 14+, TypeScript, Zustand, Vitest.

---

### Task 1: Update creation flow tests

- Modify `tests/withdraw-page.test.tsx` to expect `router.push('/withdraw/{id}')` on success.
- Keep tests for error/retry and double submit.

### Task 2: Implement redirect from form

- Modify `src/components/withdraw-form.tsx` and `src/store/withdraw-store.ts` to return created id and navigate.

### Task 3: Add details page and tests

- Create `app/withdraw/[id]/page.tsx` and details component.
- Add `tests/withdraw-details-page.test.tsx` with success and not-found cases.

### Task 4: Verify

- Run `npm run test` and ensure all tests pass.
