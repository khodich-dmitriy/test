# Withdraw Details Page Design

## Goal

После успешного создания заявки на `/withdraw` переходить на отдельную страницу `/withdraw/[id]`, где заявка загружается через `GET /v1/withdrawals/{id}` и отображается со статусом.

## Design

- Оставить `/withdraw` страницей создания заявки.
- После успешного `POST /v1/withdrawals` делать redirect на `/withdraw/{id}`.
- Добавить страницу `app/withdraw/[id]/page.tsx`.
- На странице деталей использовать клиентский компонент с `useEffect` и `fetchWithdrawal(id)`.
- Состояния деталей: `loading`, `success`, `error`.
- Для `404` показывать понятный текст (`Withdrawal not found`).

## Testing

- Обновить `tests/withdraw-page.test.tsx`: проверять redirect после успеха.
- Добавить `tests/withdraw-details-page.test.tsx`: успешная загрузка по id и ошибка 404.
