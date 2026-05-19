import { readSystemDb } from '../../../../../shared/mock/system-db';
import type { SupportSession } from './auth';

const SUPPORT_PASSWORD = 'support123';
const ADMIN_PASSWORD = 'admin123';

export function validateSupportLogin(username: string, password: string): SupportSession | null {
  const normalized = username.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'admin' && password === ADMIN_PASSWORD) {
    return { username: normalized, role: 'admin' };
  }

  if (password !== SUPPORT_PASSWORD) {
    return null;
  }

  const staffMember = readSystemDb((db) =>
    db.staff.find((item) => item.username.toLowerCase() === normalized)
  );

  if (!staffMember) {
    return null;
  }

  return {
    username: staffMember.username,
    role: staffMember.role
  };
}
