# Withdraw Demo (Next.js 14+)

Demo-проект страницы `Withdraw` с mock API, idempotency key, retry и тестами.
Система доступна только авторизованным пользователям (mock auth).

## Требования

- Node.js `>= 18.17` (рекомендуется `24.x`)
- npm

## Запуск

```bash
nvm use 24.14.0
npm install
npm run dev
```

Открыть: `http://localhost:3000/withdraw`

Основное приложение вынесено в отдельную папку `withdraw-app/`.

### Отдельная админка поддержки

Админка запускается отдельным приложением и отдельным процессом:

```bash
npm run dev:support-admin
```

Открыть: `http://localhost:3001/login`

Демо логины:
- `admin / admin123` (может добавлять пользователей поддержки)
- `support / support123`

Отдельные скрипты:
- `npm run build:support-admin`
- `npm run start:support-admin`

Если нет сессии, будет редирект на `http://localhost:3001/login`.

После успешного создания выполняется переход на страницу заявки:
`http://localhost:3000/withdraw/{id}`

## Тесты

```bash
nvm use 24.14.0
npm run test
```

E2E (Playwright):

```bash
npm run e2e
```

## API (mock)

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /v1/withdrawals`
- `GET /v1/withdrawals/{id}`
- `GET /v1/support/withdrawals/{withdrawalId}/ticket` (чат по заявке для пользователя)
- `POST /v1/support/tickets/{ticketId}/messages` (ответ пользователя в чат)
- `GET /v1/support/tickets/{ticketId}/stream` (SSE для пользовательского чата)

Support-admin (отдельное приложение на `:3001`):
- `POST /auth/login`
- `POST /auth/logout`
- `GET /v1/support/users`
- `GET /v1/support/users/{userId}`
- `GET /v1/support/tickets/{ticketId}`
- `POST /v1/support/tickets/{ticketId}/messages`
- `GET /v1/support/tickets/{ticketId}/stream` (SSE)
- `GET /v1/support/staff` (admin only)
- `POST /v1/support/staff` (admin only)

Route handlers расположены в:

- `withdraw-app/app/auth/login/route.ts`
- `withdraw-app/app/auth/refresh/route.ts`
- `withdraw-app/app/auth/logout/route.ts`
- `withdraw-app/app/v1/withdrawals/route.ts`
- `withdraw-app/app/v1/withdrawals/[id]/route.ts`
- `withdraw-app/app/v1/support/withdrawals/[withdrawalId]/ticket/route.ts`
- `withdraw-app/app/v1/support/tickets/[ticketId]/messages/route.ts`
- `withdraw-app/app/v1/support/tickets/[ticketId]/stream/route.ts`

## Mock Auth

- Логин страница: `/login`
- Demo credentials:
  - `username: demo`
  - `password: demo123`
- При успешном входе выставляются `httpOnly` cookies:
  - short-lived `access` token
  - long-lived `refresh` token
- При `401` на запросе вывода клиент автоматически вызывает `/auth/refresh` и повторяет исходный запрос.
- Если refresh успешен, данные формы не теряются.
- Logout очищает оба cookie.
- Кнопка `Logout` расположена только в private layout header.
- Middleware (`withdraw-app/middleware.ts`) защищает приложение и редиректит неавторизованных на `/login`.

## Общий mock-store между приложениями

`main app (:3000)` и `support-admin (:3001)` используют общее файловое mock-хранилище:
- файл по умолчанию: `/tmp/testfront-shared-mock-db.json`
- можно переопределить переменной окружения: `MOCK_SYSTEM_DB_FILE_PATH`

Это позволяет отлаживать чат и обращения поддержки между двумя отдельными локальными процессами.

## Что реализовано

- Форма `amount`, `destination`, `confirm`
- Валидация:
  - `amount > 0`
  - `destination` обязательна и непустая
  - `confirm` обязателен
- `Submit` доступен только при валидной форме
- Во время запроса `Submit` disabled
- Форма реализована на `react-hook-form` + `yup`
- `MoneyInput` для суммы с фильтрацией невалидных символов
- Кастомный стилизованный checkbox
- Состояния UI: `idle/loading/success/error`
- Защита от двойного submit
- Idempotency:
  - в `POST` отправляется `idempotency_key`
  - при `409` отображается понятный текст
- При сетевой ошибке доступен `Retry` без потери введенных данных
- При истекшем access токене происходит auto-refresh и повтор отправки без потери данных
- После успеха отображаются созданная заявка и её статус (через `GET /v1/withdrawals/{id}`)
- После успешного submit происходит redirect на отдельную страницу заявки `/withdraw/[id]`
- Страница `/withdraw/[id]` загружает заявку на сервере (без клиентского повторного запроса)
- На странице `/withdraw/[id]` доступен пользовательский чат поддержки по конкретной заявке
- Чат в `withdraw-app` и `support-admin` синхронизируется в realtime через SSE и общее mock-хранилище
- Optional:
  - восстановление последней успешной заявки после reload (до 5 минут, `sessionStorage`)

## Архитектурные решения

- Проект разложен по Feature-Sliced Design:
  - `src/shared` — общие UI/утилиты
  - `src/entities` — доменные сущности (`withdrawal`, `session`)
  - `src/features` — пользовательские сценарии (`auth/login`, `auth/logout`, `withdraw/create`)
  - `src/widgets` — компоновка интерфейса (`header`)
  - `src/pages` — page-level композиции
  - `src/app` — серверные обработчики приложения (для thin routes)
- `withdraw-app/app/*` оставлен как тонкий routing слой Next.js (страницы и route handlers делегируют в `src/*`).
- `Zustand` store (`src/features/withdraw/create/model/withdraw-store.ts`) управляет:
  - формой,
  - статусами запроса,
  - retry,
  - восстановлением последней заявки.
- Валидация и управление формами: `react-hook-form` + `yup`.
- UI стили реализованы через CSS Modules в едином fintech-light стиле.
- API-клиент (`src/entities/withdrawal/api/withdrawals-api.ts`) инкапсулирует `fetch` и typed ошибки (`WithdrawApiError`, `WithdrawNetworkError`).
- In-memory mock backend (`src/entities/withdrawal/model/mock-withdrawal-store.ts`) хранит заявки и проверяет уникальность `idempotency_key`.

## Безопасность

- Небезопасный рендер HTML (`dangerouslySetInnerHTML`) не используется.
- Access token не хранится в `localStorage`.
- В mock-auth сессия хранится в `httpOnly` cookie.
- Прод-подход для auth:
  - `httpOnly`, `secure`, `sameSite` cookies для refresh/session,
  - короткоживущий access token в памяти (или server-side session),
  - ротация токенов и CSRF-защита для state-changing запросов.

## Структура

- `withdraw-app/app/(public)/layout.tsx` — layout публичных роутов
- `withdraw-app/app/(public)/login/page.tsx` — страница входа
- `withdraw-app/app/(private)/layout.tsx` — layout приватных роутов
- `withdraw-app/app/(private)/withdraw/page.tsx` — страница Withdraw
- `withdraw-app/app/(private)/withdraw/[id]/page.tsx` — отдельная страница созданной заявки
- `src/pages/*` — page-compositions
- `src/widgets/header/ui/app-header.tsx` — общий header c Logout
- `src/features/withdraw/create/ui/withdraw-form.tsx` — форма вывода
- `src/features/withdraw/create/model/withdraw-store.ts` — состояние и бизнес-логика withdraw
- `src/features/auth/login/ui/login-form.tsx` — форма авторизации
- `src/entities/withdrawal/*` — типы, api, форматтеры, status-chip, mock-store
- `src/entities/session/*` — auth model и redirect rules
- `src/shared/ui/money-input/money-input.tsx` — MoneyInput для суммы
- `withdraw-app/middleware.ts` — защита маршрутов
- `src/app/api/*` — серверные обработчики (используются route wrappers в `withdraw-app/app/*`)
- `e2e/*.spec.ts` — Playwright e2e сценарии (auth, retry, refresh flow)
- `tests/withdraw-page.test.tsx` — основные тесты сценариев
