import { describe, expect, it } from 'vitest';

import { POST as loginPost } from '@/app/auth/login/route';
import { POST as logoutPost } from '@/app/auth/logout/route';
import { POST as refreshPost } from '@/app/auth/refresh/route';
import {
  AUTH_ACCESS_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME
} from '@/src/entities/session/model/auth';

describe('роуты моковой авторизации', () => {
  it('устанавливает access и refresh httpOnly cookie при успешном логине', async () => {
    const request = new Request('http://localhost/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo', password: 'demo123' })
    });

    const response = await loginPost(request);

    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie') || '';
    expect(setCookie).toContain(`${AUTH_ACCESS_COOKIE_NAME}=access_ok`);
    expect(setCookie).toContain(`${AUTH_REFRESH_COOKIE_NAME}=refresh_ok`);
    expect(setCookie.toLowerCase()).toContain('httponly');
  });

  it('возвращает 401 при невалидных учетных данных', async () => {
    const request = new Request('http://localhost/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo', password: 'wrong' })
    });

    const response = await loginPost(request);

    expect(response.status).toBe(401);
  });

  it('обновляет access cookie через refresh endpoint', async () => {
    const response = await refreshPost(
      new Request('http://localhost/auth/refresh', {
        method: 'POST',
        headers: {
          cookie: `${AUTH_REFRESH_COOKIE_NAME}=refresh_ok`
        }
      })
    );

    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie') || '';
    expect(setCookie).toContain(`${AUTH_ACCESS_COOKIE_NAME}=access_ok`);
  });

  it('очищает access и refresh cookie при logout', async () => {
    const response = await logoutPost(
      new Request('http://localhost/auth/logout', { method: 'POST' })
    );

    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie') || '';
    expect(setCookie).toContain(`${AUTH_ACCESS_COOKIE_NAME}=`);
    expect(setCookie).toContain(`${AUTH_REFRESH_COOKIE_NAME}=`);
    expect(setCookie.toLowerCase()).toContain('max-age=0');
  });
});
