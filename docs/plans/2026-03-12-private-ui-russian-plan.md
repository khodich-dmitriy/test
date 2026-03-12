# Private UI Russian Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Перевести пользовательский интерфейс приложения на русский, обновить футер в стиле приложения и исправить текстовые ошибки.

**Architecture:** Меняем только слой пользовательских строк и легкую стилизацию футера, не затрагивая бизнес-логику вывода. Проверка строится вокруг RTL/Vitest тестов на ключевые пользовательские сценарии и финального поиска по исходникам.

**Tech Stack:** Next.js, React, TypeScript, CSS Modules, Vitest, Testing Library

---

### Task 1: Зафиксировать ожидаемый русский UI тестами

**Files:**
- Modify: `tests/withdraw-page.test.tsx`
- Modify: `tests/login-page.test.tsx`
- Modify: `tests/withdraw-details-page.test.tsx`
- Modify: `tests/smoke.test.tsx`

**Step 1: Write the failing test**

- Добавить ожидания на русские заголовки, кнопки, aria-label и тексты состояний.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/withdraw-page.test.tsx tests/login-page.test.tsx tests/withdraw-details-page.test.tsx tests/smoke.test.tsx`
Expected: FAIL на старых английских строках.

**Step 3: Write minimal implementation**

- Перевести строки в компонентах и моделях, которые рендерят пользовательский текст.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/withdraw-page.test.tsx tests/login-page.test.tsx tests/withdraw-details-page.test.tsx tests/smoke.test.tsx`
Expected: PASS

### Task 2: Обновить футер и остаточные UI-строки

**Files:**
- Modify: `src/widgets/footer/ui/app-footer.tsx`
- Modify: `src/widgets/footer/ui/app-footer.module.css`
- Modify: `src/widgets/header/ui/app-header.tsx`
- Modify: `src/views/home/ui/home-page.tsx`
- Modify: `src/views/stub/ui/stub-page.tsx`
- Modify: `src/entities/theme/model/theme.ts`

**Step 1: Write the failing test**

- Зафиксировать русские тексты футера/домашней страницы/входа в существующих тестах.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/login-page.test.tsx tests/smoke.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

- Перевести тексты и привести футер к стилю оболочки приложения.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/login-page.test.tsx tests/smoke.test.tsx`
Expected: PASS

### Task 3: Проверить, что английский UI не остался

**Files:**
- Modify: `src/features/withdraw/create/ui/withdraw-form.tsx`
- Modify: `src/features/withdraw/feed/ui/withdraw-feed.tsx`
- Modify: `src/features/withdraw/feed/ui/withdraw-feed-item.tsx`
- Modify: `src/features/withdraw/feed/ui/delete-withdrawal-modal.tsx`
- Modify: `src/views/withdraw-details/ui/withdraw-details-page.tsx`
- Modify: `src/entities/withdrawal/ui/status-chip/status-chip.tsx`
- Modify: `src/features/auth/login/ui/login-form.tsx`
- Modify: `src/features/auth/logout/ui/logout-button.tsx`
- Modify: `src/features/theme/select/ui/theme-switcher.tsx`
- Modify: `src/features/withdraw/feed/model/use-withdraw-feed.ts`
- Modify: `src/entities/session/api/auth-api.ts`

**Step 1: Write the failing test**

- Использовать уже добавленные проверки на русский UI.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/withdraw-page.test.tsx tests/login-page.test.tsx tests/withdraw-details-page.test.tsx tests/smoke.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

- Перевести оставшиеся пользовательские строки, включая статусы, ошибки и aria-label.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/withdraw-page.test.tsx tests/login-page.test.tsx tests/withdraw-details-page.test.tsx tests/smoke.test.tsx`
Expected: PASS

### Task 4: Финальная верификация

**Files:**
- Modify: `none`

**Step 1: Run targeted tests**

Run: `npm test -- --run tests/withdraw-page.test.tsx tests/login-page.test.tsx tests/withdraw-details-page.test.tsx tests/smoke.test.tsx`
Expected: PASS

**Step 2: Run UI string search**

Run: `rg -n "Withdraw|Login|Sign in|Open|Delete|Retry|Theme|Pending|Processing|Completed|Failed|Loading" src/views src/widgets src/features src/entities`
Expected: только технические идентификаторы или отсутствие пользовательских строк.
