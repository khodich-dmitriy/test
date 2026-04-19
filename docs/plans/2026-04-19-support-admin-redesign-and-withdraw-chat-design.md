# Support Admin Redesign And Withdraw Ticket Chat Design

## Goal

Обновить интерфейс `support-admin` до цельной и удобной админ-панели и добавить пользователю в основном приложении (`withdraw-app`) realtime-вебчат поддержки на странице конкретной заявки `/withdraw/[id]`.

## Product Scope

### In Scope

- Визуальный редизайн всех основных экранов `support-admin`:
  - `/login`
  - `/users`
  - `/users/[userId]`
  - `/tickets/[ticketId]`
  - `/staff`
- Единый app shell админки (навигация + контентная зона + консистентные UI-токены).
- Пользовательский чат по заявке на `/withdraw/[id]`.
- Realtime-обновления чата через SSE в админке и в основном приложении.
- Серверная авторизация и проверки доступа к тикетам для пользовательских маршрутов.
- Покрытие ключевых сценариев тестами.

### Out Of Scope

- Полноценный прод-чат с delivery/read receipts, вложениями, typing indicators.
- Перестройка доменной модели тикетов и ролей за пределами текущего mock-backend.
- Внедрение внешней БД/очередей.

## Current State

- Админка использует минимальные инлайн-стили и не имеет общего shell/layout-паттерна.
- Чат в админке уже существует и работает по тикету (`/tickets/[ticketId]`).
- Пользовательского чата в `withdraw-app` нет.
- Текущее SSE в админке основано на in-memory broker (`support-admin/src/entities/support/model/sse-broker.ts`), что не работает между двумя независимыми процессами (`:3000` и `:3001`).

## UX Direction

### Design Principles

- Ясная визуальная иерархия (первичный контент и вторичные метаданные).
- Плотная, но читаемая операционная UI-структура для поддержки.
- Единые токены цвета/типографики/отступов на уровне админки.
- Явные состояния: loading, empty, error, reconnecting.

### Support Admin IA

- Sidebar:
  - `Users`
  - `Staff` (видимо только для `admin`)
  - `Logout`
- Topbar:
  - текущий оператор
  - роль
  - краткий статус сессии
- Content:
  - карточки/списки/таблицы с консистентными контейнерами и отступами.

### Ticket Chat UX

- Диалоговые bubbles по ролям:
  - `user` слева
  - `support` справа
- Метки времени для сообщений.
- Sticky composer внизу чата.
- Индикатор подключения SSE: `Connected` / `Reconnecting`.

### Withdraw Details Chat UX

- На странице `/withdraw/[id]` под деталями заявки добавляется отдельная карточка `Support chat`.
- В карточке:
  - история сообщений по тикету этой заявки,
  - индикатор подключения SSE,
  - форма отправки сообщения пользователем.
- Если тикет не найден для заявки — аккуратный empty-state без падения страницы.

## Architecture

### Shared Data Source

Оба приложения продолжают использовать `shared/mock/system-db.ts` как единый источник данных (`tickets`, `messages`, `withdrawals`, `users`, `staff`).

### Cross-Process Realtime

Вместо in-memory pub/sub для realtime используется DB-backed SSE поток:

- SSE route удерживает соединение.
- Периодически читает `system-db`.
- Сравнивает список сообщений тикета с последним отправленным состоянием.
- Пушит только новые сообщения клиенту.
- Отправляет keep-alive events.

Это позволяет realtime между разными Node-процессами.

### API Surface

#### Support Admin

- Сохраняются существующие маршруты, но SSE реализация `GET /v1/support/tickets/{ticketId}/stream` переводится на DB-backed механизм.

#### Withdraw App (new)

- `GET /v1/support/withdrawals/{withdrawalId}/ticket`
  - Возвращает `{ ticket, messages }` для текущего пользователя.
- `POST /v1/support/tickets/{ticketId}/messages`
  - Добавляет сообщение с `sender_role: 'user'`.
- `GET /v1/support/tickets/{ticketId}/stream`
  - SSE поток новых сообщений по тикету.

### Access Control

#### Support Admin

- Логика middleware и ролей (`admin`/`support`) сохраняется.

#### Withdraw App

- Для новых support-маршрутов требуется активная пользовательская сессия.
- Пользователь может читать/писать только в тикеты, где:
  - `ticket.withdrawal_id === withdrawalId`
  - `ticket.user_id` совпадает с текущим user id.
- Ошибки:
  - `401` — без сессии
  - `403` — чужой тикет
  - `404` — тикет/заявка не найдены

## Component-Level Plan

### Support Admin

- Ввести общий UI слой/токены для админки:
  - CSS custom properties,
  - базовые layout utility классы,
  - module styles для страниц.
- Перенести текущие view-компоненты с inline-style на CSS modules:
  - `users-page.tsx`
  - `user-details-page.tsx`
  - `ticket-chat-page.tsx`
  - `staff-page.tsx`
  - `login-page.tsx` + `login-form.tsx`
- Добавить shell-компонент для повторного использования в защищенных роутингах.

### Withdraw App

- На `src/views/withdraw-details/ui/withdraw-details-page.tsx` добавить блок `SupportChatCard`.
- Вынести чат в отдельный feature-компонент (например `src/features/support/chat/*`).
- Реализовать клиентский SSE subscription + дедупликацию сообщений по `id`.
- Реализовать отправку пользовательского сообщения в новый route handler.

## Error Handling

- Некорректный payload -> `400`.
- Пустой текст сообщения -> `400`.
- Ошибки чтения/доступа к тикету -> `403/404`.
- SSE disconnect -> UI статус `Reconnecting`, автопереподключение через стандартный `EventSource` цикл.
- UI должен оставаться функциональным при временном сбое SSE (ручная отправка и последующий recovery).

## Testing Strategy

### Unit/Integration

- Обновить/дополнить route tests:
  - проверка новых user support endpoints,
  - проверка ограничений доступа.
- Добавить тесты для user chat компонента:
  - дедуп SSE событий,
  - отправка сообщений,
  - обработка ошибок.
- Обновить существующие tests админки, завязанные на текст/markup после редизайна.

### Regression

- Прогнать `npm run test`.
- Точечно проверить сценарий двух приложений:
  1. Пользователь создает withdrawal.
  2. На `/withdraw/[id]` видит и отправляет сообщение.
  3. В админке на соответствующем тикете сообщение появляется realtime.
  4. Ответ поддержки появляется realtime в пользовательском чате.

## Risks And Mitigations

- **Risk:** polling-based SSE может давать лишнюю нагрузку.
  - **Mitigation:** ограниченный интервал, фильтрация по `ticket_id`, отдача только дельты.
- **Risk:** расхождение доступа между приложениями.
  - **Mitigation:** вынести проверки в общие helper-функции и покрыть route tests.
- **Risk:** регрессия UI тестов из-за редизайна.
  - **Mitigation:** сохранять стабильные test ids для критичных элементов.

## Success Criteria

- Админка имеет цельный современный UI с единым shell.
- Пользователь может общаться с поддержкой по конкретной заявке на `/withdraw/[id]`.
- Realtime работает между `withdraw-app` и `support-admin` в обоих направлениях.
- Все профильные тесты проходят.
