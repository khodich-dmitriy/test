# Scroll Shell Transparency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make header and footer become more transparent while content scrolls under them.

**Architecture:** Introduce a small client shell wrapper that observes the main scroll container and computes top/bottom overlap state. Pass those booleans into header and footer, then map them to CSS state classes with transitions.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS Modules, Vitest, Testing Library

---

### Task 1: Add failing scroll-state test

**Files:**
- Create: `tests/shell-scroll-effects.test.tsx`

**Step 1: Write the failing test**

- Assert that header/footer receive active state attributes when the scroll container is scrolled away from top/bottom.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/shell-scroll-effects.test.tsx`
Expected: FAIL because there is no scroll shell or state attributes yet.

**Step 3: Write minimal implementation**

- Add shell component, scroll listener and active state wiring.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/shell-scroll-effects.test.tsx`
Expected: PASS
