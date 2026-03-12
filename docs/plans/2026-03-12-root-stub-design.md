# Root Stub Redirect Design

**Date:** 2026-03-12

## Goal

Temporarily disable the home page and redirect requests for `/` to a dedicated stub page while preserving existing auth redirect behavior for login, private pages, and auth API routes.

## Approved Rules

- `/` redirects to `/stub`.
- `/stub` is publicly accessible.
- `/login` remains guest-only and redirects authenticated users to `/withdraw`.
- `/withdraw` and nested withdraw routes remain private and redirect guests to `/login`.
- `/auth/*` routes remain excluded from auth redirect behavior.

## Design

Route access policy should be explicit instead of inferred from `null` results. The redirect resolver will classify the incoming pathname into one of a small set of route types and then return the correct redirect target, if any.

The middleware should stay thin: read auth state from cookies, ask the route policy for a redirect target, and perform the redirect when needed.

## Testing

- Extend redirect policy tests to cover `/ -> /stub`.
- Cover `/stub` as a public route.
- Preserve existing tests for login, private routes, and auth API routes.
