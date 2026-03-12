# React i18next Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add full-app i18n with `react-i18next`, persisted language selection in the header, and a softer footer edge.

**Architecture:** The root layout will resolve the active language from a cookie and bootstrap a single client i18n provider for the whole app. All user-facing strings move into shared translation resources, and header controls update both the active i18n language and the persistence cookie.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS Modules, i18next, react-i18next, Vitest, Testing Library

---

### Task 1: Add failing i18n tests

**Files:**
- Modify: `tests/login-page.test.tsx`
- Modify: `tests/withdraw-page.test.tsx`
- Modify: `tests/withdraw-details-page.test.tsx`
- Modify: `tests/smoke.test.tsx`
- Create: `tests/i18n.test.tsx`

**Step 1: Write the failing test**

- Add tests for default Russian content, language switching to English/Chinese, and persisted language bootstrap.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/i18n.test.tsx tests/login-page.test.tsx tests/withdraw-page.test.tsx tests/withdraw-details-page.test.tsx tests/smoke.test.tsx`
Expected: FAIL because the project has no `react-i18next` integration or language switcher.

**Step 3: Write minimal implementation**

- Introduce i18n provider, resources, language switcher, and translate user-facing strings.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/i18n.test.tsx tests/login-page.test.tsx tests/withdraw-page.test.tsx tests/withdraw-details-page.test.tsx tests/smoke.test.tsx`
Expected: PASS

### Task 2: Add library and shared i18n bootstrap

**Files:**
- Modify: `package.json`
- Create: `src/shared/i18n/config.ts`
- Create: `src/shared/i18n/resources.ts`
- Create: `src/shared/i18n/provider.tsx`
- Create: `src/shared/i18n/client.ts`
- Create: `src/shared/i18n/get-fixed-t.ts`

**Step 1: Write the failing test**

- Reuse the new i18n tests expecting translated strings and current language bootstrap.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/i18n.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

- Install `i18next` and `react-i18next`.
- Create typed language configuration and shared translation resources.
- Create a provider that initializes i18next once and synchronizes the current language.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/i18n.test.tsx`
Expected: PASS

### Task 3: Wire layouts and header controls

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/(private)/layout.tsx`
- Modify: `src/widgets/header/ui/app-header.tsx`
- Modify: `src/shared/config/test-ids.ts`
- Create: `src/features/language/select/ui/language-switcher.tsx`
- Create: `src/features/language/select/ui/language-switcher.module.css`

**Step 1: Write the failing test**

- Assert `html lang` and the presence of a language select in the header.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/i18n.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

- Read language cookie in root layout.
- Pass initial language to the provider and header.
- Add a language switcher that updates i18n, cookie and document language.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/i18n.test.tsx`
Expected: PASS

### Task 4: Translate screens and formatting

**Files:**
- Modify: `src/views/home/ui/home-page.tsx`
- Modify: `src/views/stub/ui/stub-page.tsx`
- Modify: `src/features/auth/login/ui/login-form.tsx`
- Modify: `src/features/auth/logout/ui/logout-button.tsx`
- Modify: `src/features/theme/select/ui/theme-switcher.tsx`
- Modify: `src/widgets/footer/ui/app-footer.tsx`
- Modify: `src/features/withdraw/create/ui/withdraw-form.tsx`
- Modify: `src/features/withdraw/feed/ui/withdraw-feed.tsx`
- Modify: `src/features/withdraw/feed/ui/withdraw-feed-item.tsx`
- Modify: `src/features/withdraw/feed/ui/delete-withdrawal-modal.tsx`
- Modify: `src/views/withdraw-details/ui/withdraw-details-page.tsx`
- Modify: `src/entities/withdrawal/ui/status-chip/status-chip.tsx`
- Modify: `src/entities/withdrawal/lib/formatters.ts`

**Step 1: Write the failing test**

- Use updated UI tests to assert localized strings for default language and switch behavior.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/login-page.test.tsx tests/withdraw-page.test.tsx tests/withdraw-details-page.test.tsx tests/smoke.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

- Replace hardcoded strings with `t(...)`.
- Make date formatting locale-aware.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/login-page.test.tsx tests/withdraw-page.test.tsx tests/withdraw-details-page.test.tsx tests/smoke.test.tsx`
Expected: PASS

### Task 5: Add footer top shadow and final verification

**Files:**
- Modify: `src/widgets/footer/ui/app-footer.module.css`

**Step 1: Write the failing test**

- Cover footer render presence in existing i18n/UI tests.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/i18n.test.tsx`
Expected: FAIL until the footer is updated.

**Step 3: Write minimal implementation**

- Add a soft top edge using a pseudo-element or inset shadow without changing the footer layout.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/i18n.test.tsx tests/login-page.test.tsx tests/withdraw-page.test.tsx tests/withdraw-details-page.test.tsx tests/smoke.test.tsx`
Expected: PASS
