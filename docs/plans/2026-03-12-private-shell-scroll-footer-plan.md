# Private Shell Scroll Footer Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a private-zone footer, move scrolling into the content area between header and footer, theme the scrollbars, and hide the withdrawals feed block when it has no items.

**Architecture:** Build a dedicated private layout shell with three rows: header, scrollable content, footer. Apply theme-aware scrollbar styles globally and to internal scroll containers. Keep `/withdraw` feed mounted only when it has data or is loading.

**Tech Stack:** Next.js App Router, React, CSS Modules, Vitest, Testing Library

---

### Task 1: Lock hidden-empty-feed behavior with a test

**Files:**
- Modify: `tests/withdraw-page.test.tsx`

**Step 1: Write the failing test**

Assert that an empty feed response does not render the `Recent withdrawals` block.

**Step 2: Run test**

Run: `npm test -- tests/withdraw-page.test.tsx`
Expected: FAIL until the feed is conditionally hidden.

### Task 2: Implement private shell and scrollbars

**Files:**
- Modify: `app/(private)/layout.tsx`
- Modify: `app/globals.css`
- Modify: `src/widgets/header/ui/app-header.module.css`
- Create: `src/widgets/footer/ui/app-footer.tsx`
- Create: `src/widgets/footer/ui/app-footer.module.css`

**Step 1: Build private shell**

Use a three-row layout with a scrollable middle section.

**Step 2: Add footer**

Render a lightweight footer only in the private zone.

**Step 3: Theme the scrollbars**

Style page and container scrollbars with theme variables.

### Task 3: Hide empty feed block

**Files:**
- Modify: `src/features/withdraw/feed/ui/withdraw-feed.tsx`

**Step 1: Do not render the feed card when there are no items and loading is complete**

The create form remains visible; only the feed block disappears.

### Task 4: Verify

**Files:**
- Test: `tests/withdraw-page.test.tsx`

**Step 1: Run focused tests**

Run: `npm test -- tests/withdraw-page.test.tsx`
Expected: PASS
