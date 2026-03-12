import { describe, expect, it } from 'vitest';

import { resolveAuthRedirect } from '@/src/entities/session/lib/auth-redirect';
import { AppRoute, AuthApiRoute } from '@/src/shared/config/urls';

describe('правила редиректов авторизации', () => {
  it('редиректит корневой маршрут на страницу заглушки независимо от авторизации', () => {
    expect(resolveAuthRedirect(AppRoute.ROOT, false)).toBe(AppRoute.STUB);
    expect(resolveAuthRedirect(AppRoute.ROOT, true)).toBe(AppRoute.STUB);
  });

  it('редиректит неавторизованного пользователя с приватных страниц на login', () => {
    expect(resolveAuthRedirect(AppRoute.WITHDRAW, false)).toBe(AppRoute.LOGIN);
    expect(resolveAuthRedirect(`${AppRoute.WITHDRAW}/w_1`, false)).toBe(AppRoute.LOGIN);
  });

  it('разрешает неавторизованному пользователю открыть login, stub и auth endpoints', () => {
    expect(resolveAuthRedirect(AppRoute.LOGIN, false)).toBeNull();
    expect(resolveAuthRedirect(AppRoute.STUB, false)).toBeNull();
    expect(resolveAuthRedirect(AuthApiRoute.LOGIN, false)).toBeNull();
    expect(resolveAuthRedirect(AuthApiRoute.LOGOUT, false)).toBeNull();
  });

  it('редиректит авторизованного пользователя с login на withdraw', () => {
    expect(resolveAuthRedirect(AppRoute.LOGIN, true)).toBe(AppRoute.WITHDRAW);
  });

  it('разрешает авторизованному пользователю доступ к приватным страницам', () => {
    expect(resolveAuthRedirect(AppRoute.WITHDRAW, true)).toBeNull();
  });
});
