# Full-App FSD Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the whole app to Feature-Sliced Design while keeping behavior unchanged.

**Architecture:** Keep Next.js `app/*` as routing-only entrypoints. Move all business logic, UI, styles, and domain code into FSD layers under `src/{app,pages,widgets,features,entities,shared}`. Use re-exports/adapters where needed to minimize breakage.

**Tech Stack:** Next.js 14+, TypeScript, Zustand, React Hook Form, Yup, Vitest.

---

### Task 1: Create target FSD directories and move shared primitives

- Move generic UI primitives and cross-cutting libs into `src/shared/*`
- Update imports and tests.

### Task 2: Move domain models into entities

- `entities/withdrawal`: types, formatters, api client, mock store, status-chip, money input.
- `entities/session`: auth cookie model and redirect rules.
- Update imports.

### Task 3: Move actions into features

- `features/auth`: login-form + logout-button.
- `features/withdraw`: create-withdrawal form + model(store).

### Task 4: Move compositions into widgets/pages

- `widgets/header`
- `pages/{home,login,withdraw,withdraw-details}`
- Next app pages import from `src/pages/*` only.

### Task 5: Move backend handlers to app layer in src

- `src/app/api/*` handlers for login/logout/withdrawals.
- Next `app/*/route.ts` files call these handlers.
- middleware uses `src/app/*` gate helpers.

### Task 6: Update tests, docs, run verification

- Update test imports to new FSD paths.
- Update README architecture section.
- Run full test suite.
