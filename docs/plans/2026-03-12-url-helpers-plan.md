# URL Helpers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove hardcoded `http://localhost` request URLs by introducing shared URL helpers.

**Architecture:** Centralize app/test URL construction in `src/shared/config/urls.ts`, then reuse those helpers in client API code and route tests. This keeps paths canonical and avoids ad-hoc base URL strings.

**Tech Stack:** Next.js, TypeScript, Vitest

---

### Task 1: Add failing tests for shared URL helpers

**Files:**
- Modify: `tests/withdraw-feed-api.test.ts`
- Create: `tests/url-helpers.test.ts`

**Step 1: Write the failing test**

- Assert that shared helpers build absolute test URLs and feed URLs without hardcoded localhost strings in tests.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/url-helpers.test.ts tests/withdraw-feed-api.test.ts`
Expected: FAIL because the helpers do not exist yet.

**Step 3: Write minimal implementation**

- Add URL builders to shared config and consume them from tests/API code.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/url-helpers.test.ts tests/withdraw-feed-api.test.ts`
Expected: PASS
