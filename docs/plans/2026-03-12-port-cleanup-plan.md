# Port Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure app startup commands clear port `3000` before launching Next.js.

**Architecture:** Add a small local Node wrapper script that kills listeners on port `3000` and then delegates to `next dev` or `next start`. Update `package.json` so both startup entry points go through that wrapper.

**Tech Stack:** Node.js, npm scripts, Vitest

---

### Task 1: Lock startup script behavior with tests

**Files:**
- Create: `tests/startup-scripts.test.ts`

**Step 1: Write the failing test**

Assert that:

```ts
packageJson.scripts.dev === 'node scripts/run-next-with-port-cleanup.mjs dev'
packageJson.scripts.start === 'node scripts/run-next-with-port-cleanup.mjs start'
```

and that the wrapper exports a command builder for `dev` and `start`.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/startup-scripts.test.ts`
Expected: FAIL because wrapper script does not exist and scripts still call `next` directly.

### Task 2: Implement the wrapper

**Files:**
- Create: `scripts/run-next-with-port-cleanup.mjs`
- Modify: `package.json`

**Step 1: Add a minimal wrapper**

The wrapper should:
- kill processes listening on TCP port `3000`
- ignore the case where the port is already free
- spawn `next dev` or `next start` with inherited stdio

**Step 2: Wire npm scripts**

Update:

```json
"dev": "node scripts/run-next-with-port-cleanup.mjs dev",
"start": "node scripts/run-next-with-port-cleanup.mjs start"
```

### Task 3: Verify

**Files:**
- Test: `tests/startup-scripts.test.ts`

**Step 1: Run focused test**

Run: `npm test -- tests/startup-scripts.test.ts`
Expected: PASS
