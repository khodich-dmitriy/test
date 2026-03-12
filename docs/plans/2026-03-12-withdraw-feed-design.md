# Withdraw Feed Design

**Date:** 2026-03-12

## Goal

Extend the `/withdraw` page with a short-form list of withdrawals under the creation form. The list should load newest items first, support cursor-based infinite loading with virtualization, and allow deleting a withdrawal directly from the list with confirmation.

## Approved Rules

- The create form stays at the top of `/withdraw`.
- Successful creation keeps the user on `/withdraw`.
- New withdrawals appear at the top of the list immediately after creation.
- The feed uses a dedicated API endpoint with cursor pagination.
- Each list item can be deleted after confirmation.

## Design

The existing mock withdrawal store remains the single source of truth. It should be extended with feed pagination and deletion primitives so both the API handlers and the page rely on the same in-memory dataset.

The page should become a two-part client experience: the current form card on top and a virtualized feed below. The feed should fetch the first page on mount, append older pages on scroll, and update itself optimistically after create/delete operations.

## API

- `GET /v1/withdrawals/feed?cursor=<id>&limit=<n>`
  - returns `items`, `nextCursor`, `hasMore`
  - items ordered by `created_at desc`
- `DELETE /v1/withdrawals/:id`
  - returns `204` when deleted
  - returns `404` when the withdrawal is missing

## Testing

- API tests for feed ordering, cursor pagination, and delete behavior
- Page tests for:
  - form + list rendering
  - appending pages
  - staying on `/withdraw` after create and prepending new item
  - delete confirmation and item removal
