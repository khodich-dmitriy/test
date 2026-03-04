# Withdraw Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js 14+ Withdraw page with idempotent mock API integration, resilient UI states, retry support, and required tests.

**Architecture:** Create a fresh Next.js App Router + TypeScript project with Zustand for centralized page state and UI state machine (`idle/loading/success/error`). Implement mock API route handlers for `POST /v1/withdrawals` and `GET /v1/withdrawals/{id}` and consume them through a typed API client. Use Vitest + Testing Library for page behavior tests and protect against duplicate submissions by store-level gating.

**Tech Stack:** Next.js 14+, React, TypeScript, Zustand, Vitest, Testing Library, jsdom.

---

### Task 1: Scaffold base project and dependencies

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `.gitignore`

**Step 1: Write failing test (smoke app render)**

```tsx
// tests/smoke.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HomePage from '@/app/page';

describe('home page', () => {
  it('renders app shell', () => {
    render(<HomePage />);
    expect(screen.getByText(/withdraw/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/smoke.test.tsx`
Expected: FAIL (missing framework/config/files)

**Step 3: Write minimal implementation**

Create Next.js app shell files and test config so smoke test can run.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/smoke.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "chore: bootstrap nextjs withdraw project"
```

### Task 2: Implement mock withdrawal API

**Files:**

- Create: `src/types/withdrawal.ts`
- Create: `app/api/v1/withdrawals/route.ts`
- Create: `app/api/v1/withdrawals/[id]/route.ts`
- Create: `src/lib/mock-withdrawal-store.ts`
- Test: `tests/withdraw-api.test.ts`

**Step 1: Write failing test**

```ts
// tests/withdraw-api.test.ts
import { describe, expect, it } from 'vitest';
import { createWithdrawal, getWithdrawalById } from '@/src/lib/mock-withdrawal-store';

describe('mock withdrawal store', () => {
  it('creates and fetches withdrawal by id', () => {
    const item = createWithdrawal({ amount: 10, destination: 'dest', idempotencyKey: 'k1' });
    const fetched = getWithdrawalById(item.id);
    expect(fetched?.id).toBe(item.id);
  });

  it('throws duplicate error for same idempotency key', () => {
    createWithdrawal({ amount: 10, destination: 'dest', idempotencyKey: 'k2' });
    expect(() =>
      createWithdrawal({ amount: 10, destination: 'dest', idempotencyKey: 'k2' })
    ).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/withdraw-api.test.ts`
Expected: FAIL (missing module)

**Step 3: Write minimal implementation**

Implement in-memory map keyed by id and idempotency key, plus route handlers:

- `POST /api/v1/withdrawals`: validates body, handles duplicates with 409
- `GET /api/v1/withdrawals/{id}`: returns item or 404

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/withdraw-api.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/api src/types src/lib tests/withdraw-api.test.ts
git commit -m "feat: add mock withdrawals api"
```

### Task 3: Build API client and Zustand store state machine

**Files:**

- Create: `src/lib/withdrawals-api.ts`
- Create: `src/store/withdraw-store.ts`
- Test: `tests/withdraw-store.test.ts`

**Step 1: Write failing test**

```ts
// tests/withdraw-store.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createWithdrawStore } from '@/src/store/withdraw-store';

describe('withdraw store', () => {
  it('blocks double submit while loading', async () => {
    const post = vi.fn().mockImplementation(() => new Promise(() => {}));
    const get = vi.fn();
    const store = createWithdrawStore({
      postWithdrawal: post,
      getWithdrawal: get,
      now: () => Date.now()
    });

    store.getState().setAmount('10');
    store.getState().setDestination('abc');
    store.getState().setConfirm(true);

    void store.getState().submitWithdrawal();
    void store.getState().submitWithdrawal();

    expect(post).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/withdraw-store.test.ts`
Expected: FAIL (missing store)

**Step 3: Write minimal implementation**

Implement typed store with:

- fields: `amount`, `destination`, `confirm`
- statuses: `idle|loading|success|error`
- validation/computed `canSubmit`
- `submitWithdrawal` action with idempotency key generation and loading gate
- `retry` action reusing last payload + idempotency key
- `restoreFromSessionStorage` and persistence for 5-minute window

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/withdraw-store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/withdrawals-api.ts src/store/withdraw-store.ts tests/withdraw-store.test.ts
git commit -m "feat: add withdraw state machine and api client"
```

### Task 4: Implement Withdraw page UI

**Files:**

- Create: `app/withdraw/page.tsx`
- Create: `src/components/withdraw-form.tsx`
- Modify: `app/page.tsx`
- Test: `tests/withdraw-page.test.tsx`

**Step 1: Write failing test**

```tsx
// tests/withdraw-page.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import WithdrawPage from '@/app/withdraw/page';

describe('withdraw page', () => {
  it('happy path submit', async () => {
    render(<WithdrawPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/destination/i), 'wallet-1');
    await user.click(screen.getByLabelText(/confirm/i));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText(/created withdrawal/i)).toBeInTheDocument();
  });

  it('shows api error text', async () => {
    // force 409/mock failure and assert human-friendly text
  });

  it('prevents double submit', async () => {
    // double-click submit and assert one POST call
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/withdraw-page.test.tsx`
Expected: FAIL (missing UI/behavior)

**Step 3: Write minimal implementation**

Implement page + form bound to Zustand store with:

- validation disabled submit
- loading disabled submit
- error/success render blocks
- retry button for network errors
- restore latest successful request on mount (<= 5 minutes)

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/withdraw-page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add app/withdraw src/components app/page.tsx tests/withdraw-page.test.tsx
git commit -m "feat: implement withdraw page ui and behaviors"
```

### Task 5: Documentation and final verification

**Files:**

- Create: `README.md`

**Step 1: Write failing test**

Not applicable (documentation task).

**Step 2: Run verification before doc update**

Run: `npm run test`
Expected: PASS

**Step 3: Write minimal implementation**

Document:

- setup/run instructions
- available routes
- key architecture decisions
- idempotency and retry behavior
- optional restore behavior
- production auth approach (httpOnly cookies, not localStorage)

**Step 4: Run verification after doc update**

Run: `npm run test`
Expected: PASS

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add withdraw implementation notes"
```
