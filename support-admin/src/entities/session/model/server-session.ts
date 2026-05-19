import { cookies } from 'next/headers';

import {
  parseSessionFromCookie,
  type SupportSession
} from './auth';

async function buildCookieHeader(): Promise<string | null> {
  const cookieStore = await cookies();
  const serialized = cookieStore.getAll().map((item) => `${item.name}=${item.value}`).join('; ');
  return serialized.length > 0 ? serialized : null;
}

export async function getServerSupportSession(): Promise<SupportSession | null> {
  return parseSessionFromCookie(await buildCookieHeader());
}
