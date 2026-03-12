# Root Stub Redirect Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redirect the home route `/` to a dedicated `/stub` page without regressing existing auth redirect behavior.

**Architecture:** Keep redirect policy centralized in `src/entities/session/lib/auth-redirect.ts` and let `middleware.ts` remain a thin adapter over request cookies and redirect responses. Implement the stub as a normal Next.js page routed at `/stub`.

**Tech Stack:** Next.js App Router, TypeScript, Vitest

---

### Task 1: Lock redirect behavior with tests

**Files:**
- Modify: `tests/auth-guards.test.ts`

**Step 1: Write the failing test**

Add assertions for:

```ts
expect(resolveAuthRedirect(AppRoute.ROOT, false)).toBe(AppRoute.STUB);
expect(resolveAuthRedirect(AppRoute.ROOT, true)).toBe(AppRoute.STUB);
expect(resolveAuthRedirect(AppRoute.STUB, false)).toBeNull();
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/auth-guards.test.ts`
Expected: FAIL because `AppRoute.STUB` does not exist and `/` is not redirected yet.

### Task 2: Implement the route policy changes

**Files:**
- Modify: `src/shared/config/urls.ts`
- Modify: `src/entities/session/lib/auth-redirect.ts`

**Step 1: Add the new route constant**

Add:

```ts
STUB = '/stub'
```

to `AppRoute`.

**Step 2: Replace implicit route checks with explicit policy helpers**

Introduce helpers that classify routes as:

- ignored (`/auth/*`)
- stub (`/`)
- guest-only (`/login`)
- private (`/withdraw*`)
- public (`/stub`)

**Step 3: Return redirects from that policy**

Rules:

- stub routes redirect to `/stub` unless already on `/stub`
- private routes redirect guests to `/login`
- guest-only routes redirect authenticated users to `/withdraw`
- public and ignored routes return `null`

### Task 3: Add the stub page

**Files:**
- Create: `app/(public)/stub/page.tsx`
- Create: `src/views/stub/ui/stub-page.tsx`
- Create: `src/views/stub/ui/stub-page.module.css`

**Step 1: Create a minimal public placeholder page**

Render a simple page explaining that the section is temporarily unavailable and provide links to `/login` and `/withdraw` as appropriate.

**Step 2: Keep visual language aligned with the existing app**

Reuse the current page-level structure and CSS module pattern already used in `src/views/home/ui`.

### Task 4: Verify behavior

**Files:**
- Test: `tests/auth-guards.test.ts`

**Step 1: Run focused tests**

Run: `npm test -- tests/auth-guards.test.ts`
Expected: PASS

**Step 2: Run broader regression smoke tests if needed**

Run: `npm test`
Expected: PASS
