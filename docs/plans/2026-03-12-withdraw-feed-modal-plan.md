# Withdraw Feed Modal And Spacing Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix overlapping withdrawal cards in the virtualized feed and replace the browser delete confirmation with an in-app modal.

**Architecture:** Keep the existing virtualized feed, but increase the virtual row height to match the actual rendered card and add explicit spacing between rows. Implement a local confirmation modal inside the feed component so delete UX matches the app style and remains testable.

**Tech Stack:** React, Next.js App Router, CSS Modules, Vitest, Testing Library

---

### Task 1: Lock modal behavior with tests

**Files:**
- Modify: `tests/withdraw-page.test.tsx`

**Step 1: Write failing tests**

Cover:
- clicking `Delete` opens a confirmation modal
- confirming deletes the item
- cancelling closes the modal without deleting

**Step 2: Run tests**

Run: `npm test -- tests/withdraw-page.test.tsx`
Expected: FAIL until the modal replaces `window.confirm`.

### Task 2: Implement feed spacing and modal

**Files:**
- Modify: `src/features/withdraw/feed/ui/withdraw-feed.tsx`
- Modify: `src/features/withdraw/feed/ui/withdraw-feed.module.css`

**Step 1: Fix virtual row spacing**

Increase row height assumptions and add consistent gap/padding so cards no longer overlap.

**Step 2: Add styled delete confirmation modal**

Render a centered overlay modal with:
- title
- warning text
- cancel button
- destructive confirm button

### Task 3: Verify

**Files:**
- Test: `tests/withdraw-page.test.tsx`

**Step 1: Run focused tests**

Run: `npm test -- tests/withdraw-page.test.tsx`
Expected: PASS
