# Withdraw Page Design

**Date:** 2026-03-04

## Goal

Implement a Withdraw page in Next.js App Router with robust API interaction, resilient UI states, idempotent submit behavior, and minimum test coverage.

## Scope

- Core requirements from task statement
- Optional feature: restore latest successful withdrawal up to 5 minutes after reload
- Mock API only (no external backend dependency)

## Architecture

- Framework: Next.js 14+ (App Router) + TypeScript
- State management: Zustand store for form/request/result state
- API layer: dedicated client wrapper around fetch
- Mock backend: Next.js route handlers under `app/api/v1/withdrawals`
- Testing: Vitest + Testing Library

## Components and Data Flow

1. User fills `amount`, `destination`, `confirm`.
2. Store computes `isFormValid`.
3. Submit action:
   - prevents duplicate execution when status is `loading`
   - generates or reuses `idempotency_key`
   - sends `POST /api/v1/withdrawals`
   - handles API/network errors with user-friendly messages
4. On success:
   - fetches `GET /api/v1/withdrawals/{id}` for latest status
   - shows created withdrawal data and status
   - persists latest successful request in `sessionStorage`
5. On app load:
   - restore last successful request if timestamp age <= 5 minutes

## Validation Rules

- `amount > 0`
- `destination.trim()` is not empty
- `confirm` is checked
- Submit button enabled only when valid and not loading

## Error Handling

- `409`: explicit text indicating duplicate idempotency request
- Network error: clear error message + retry action with same payload and same idempotency key
- Retry keeps entered values intact

## Security Notes

- No unsafe HTML rendering
- No access token in `localStorage`
- README includes production recommendation: httpOnly secure cookie-based session/token flow

## Testing Strategy

Minimum required tests:

1. Happy-path submit
2. API error flow
3. Double submit protection

Extended checks in tests:

- submit disabled when invalid or loading
- retry behavior keeps inputs and reuses idempotency key

## Non-Goals

- Real Web3 integration
- Full auth system
- Multi-user/multi-currency logic
