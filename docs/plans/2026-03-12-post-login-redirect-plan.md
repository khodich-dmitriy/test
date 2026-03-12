# Post Login Redirect Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preserve the user’s intended private URL through the login flow and return them there after successful authentication.

**Architecture:** Store the intended destination in a `redirectTo` query parameter on `/login`. Middleware attaches it when redirecting guests away from private routes, and the login form safely consumes it after a successful login.

**Tech Stack:** Next.js App Router, TypeScript, Vitest

---

### Task 1: Lock the new behavior with tests

**Files:**
- Create: `tests/middleware.test.ts`
- Modify: `tests/login-page.test.tsx`

**Step 1: Write the failing tests**

Add tests proving:

```ts
// middleware
/withdraw/w_1?tab=history -> /login?redirectTo=%2Fwithdraw%2Fw_1%3Ftab%3Dhistory

// login form
redirectTo=/withdraw/w_1?tab=history -> push('/withdraw/w_1?tab=history')
redirectTo missing -> push('/withdraw')
redirectTo=https://evil.test -> push('/withdraw')
```

**Step 2: Run the focused tests**

Run: `npm test -- tests/middleware.test.ts tests/login-page.test.tsx`
Expected: FAIL until middleware and login form are updated.

### Task 2: Implement redirect target propagation

**Files:**
- Modify: `middleware.ts`
- Modify: `src/features/auth/login/ui/login-form.tsx`

**Step 1: Attach redirectTo in middleware**

When redirecting a guest from a private page to `/login`, encode and attach the current relative URL including search params.

**Step 2: Safely consume redirectTo in LoginForm**

Use `useSearchParams()` to read `redirectTo`, validate it as an internal relative URL, and use it after successful login. Fall back to `/withdraw`.

### Task 3: Verify

**Files:**
- Test: `tests/middleware.test.ts`
- Test: `tests/login-page.test.tsx`

**Step 1: Run focused tests**

Run: `npm test -- tests/middleware.test.ts tests/login-page.test.tsx`
Expected: PASS
