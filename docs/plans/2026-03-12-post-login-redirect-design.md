# Post Login Redirect Design

**Date:** 2026-03-12

## Goal

Remember the full relative URL a guest tried to open before authentication and send the user back there after a successful login. If there is no saved URL, fall back to `/withdraw`.

## Approved Rules

- A guest opening a private route is redirected to `/login?redirectTo=<encoded relative url>`.
- `redirectTo` contains the full relative target: `pathname + search`.
- After successful login, the app navigates to `redirectTo` when it is safe.
- Unsafe or missing `redirectTo` falls back to `/withdraw`.
- External URLs must not be allowed.

## Design

The redirect target should stay in the URL, not in cookies or client storage. That keeps the flow debuggable and avoids stale state cleanup.

`middleware.ts` should remain the only place that decides when a guest is forced to log in. When it redirects to `/login`, it should preserve the intended destination in `redirectTo`.

`LoginForm` should read `redirectTo` from the current search params, validate that it starts with a single `/`, and then navigate there after successful login. Invalid values should be ignored.

## Testing

- Add a middleware test for guest access to a private URL with query params.
- Add login form tests for:
  - redirecting to `redirectTo`
  - falling back to `/withdraw`
  - rejecting unsafe external redirect targets
