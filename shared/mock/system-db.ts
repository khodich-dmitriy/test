import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type SupportRole = 'admin' | 'support';
export type TicketStatus = 'open' | 'closed';
export type TicketSupportState = 'active' | 'inactive';

export interface SystemUser {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface StoredWithdrawal {
  id: string;
  amount: number;
  destination: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  user_id: string;
  idempotency_key: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  withdrawal_id: string | null;
  subject: string;
  status: TicketStatus;
  support_state?: TicketSupportState;
  assigned_staff_id?: string | null;
  assigned_staff_username?: string | null;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_role: 'user' | 'support';
  sender_name: string;
  text: string;
  reply_to_message_id?: string | null;
  created_at: string;
}

export interface SupportMessageAttachment {
  id: string;
  ticket_id: string;
  message_id: string | null;
  name: string;
  content_type: string;
  media_type?: 'file' | 'image' | 'audio' | 'video';
  transcript?: string | null;
  size: number;
  storage_key: string;
  created_at: string;
}

export interface SupportMessageReaction {
  id: string;
  message_id: string;
  emoji: string;
  actor_role: 'user' | 'support';
  actor_name: string;
  created_at: string;
  updated_at: string;
}

export interface SupportStaff {
  id: string;
  username: string;
  role: SupportRole;
  created_at: string;
}

export interface SupportChatEvent {
  id: string;
  ticket_id: string;
  type: 'message' | 'reaction' | 'assignment' | 'inactive';
  message_id?: string | null;
  reaction_id?: string | null;
  created_at: string;
}

interface SystemDbShape {
  users: SystemUser[];
  withdrawals: StoredWithdrawal[];
  tickets: SupportTicket[];
  messages: SupportMessage[];
  message_attachments: SupportMessageAttachment[];
  message_reactions: SupportMessageReaction[];
  chat_events: SupportChatEvent[];
  staff: SupportStaff[];
}

const DEFAULT_FILE_PATH = '/tmp/testfront-shared-mock-db.json';
const DEMO_USER_ID = 'user_demo';
const DEMO_CREATED_AT = '2026-01-01T00:00:00.000Z';

function createInitialDb(): SystemDbShape {
  return {
    users: [
      {
        id: DEMO_USER_ID,
        username: 'demo',
        email: 'demo@example.com',
        created_at: DEMO_CREATED_AT
      }
    ],
    withdrawals: [],
    tickets: [],
    messages: [],
    message_attachments: [],
    message_reactions: [],
    chat_events: [],
    staff: [
      {
        id: 'staff_admin',
        username: 'admin',
        role: 'admin',
        created_at: DEMO_CREATED_AT
      },
      {
        id: 'staff_support_1',
        username: 'support',
        role: 'support',
        created_at: DEMO_CREATED_AT
      }
    ]
  };
}

function resolveDbFilePath(): string {
  return process.env.MOCK_SYSTEM_DB_FILE_PATH || DEFAULT_FILE_PATH;
}

function ensureDbDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function parseDb(raw: string): SystemDbShape {
  const parsed = JSON.parse(raw) as Partial<SystemDbShape>;

  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [],
    tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
    messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    message_attachments: Array.isArray(parsed.message_attachments) ? parsed.message_attachments : [],
    message_reactions: Array.isArray(parsed.message_reactions) ? parsed.message_reactions : [],
    chat_events: Array.isArray(parsed.chat_events) ? parsed.chat_events : [],
    staff: Array.isArray(parsed.staff) ? parsed.staff : []
  };
}

function writeDbSnapshot(filePath: string, snapshot: SystemDbShape): void {
  ensureDbDir(filePath);
  const tempFile = `${filePath}.tmp`;
  writeFileSync(tempFile, JSON.stringify(snapshot, null, 2), 'utf8');
  renameSync(tempFile, filePath);
}

function readDbSnapshot(filePath: string): SystemDbShape {
  if (!existsSync(filePath)) {
    const initial = createInitialDb();
    writeDbSnapshot(filePath, initial);
    return initial;
  }

  try {
    return parseDb(readFileSync(filePath, 'utf8'));
  } catch {
    const reset = createInitialDb();
    writeDbSnapshot(filePath, reset);
    return reset;
  }
}

export function withSystemDb<T>(updater: (db: SystemDbShape) => T): T {
  const filePath = resolveDbFilePath();
  const db = readDbSnapshot(filePath);
  const result = updater(db);
  writeDbSnapshot(filePath, db);
  return result;
}

export function readSystemDb<T>(reader: (db: SystemDbShape) => T): T {
  const filePath = resolveDbFilePath();
  const db = readDbSnapshot(filePath);
  return reader(db);
}

export function resetSystemDb(): void {
  const filePath = resolveDbFilePath();
  writeDbSnapshot(filePath, createInitialDb());
}

export function ensureSystemUserByUsername(username: string): SystemUser {
  return withSystemDb((db) => {
    const normalized = username.trim().toLowerCase() || 'demo';
    const existing = db.users.find((user) => user.username.toLowerCase() === normalized);
    if (existing) {
      return existing;
    }

    const created: SystemUser = {
      id: `user_${globalThis.crypto.randomUUID()}`,
      username: normalized,
      email: `${normalized}@example.com`,
      created_at: new Date().toISOString()
    };

    db.users.push(created);
    return created;
  });
}

export function getDefaultSystemUserId(): string {
  return DEMO_USER_ID;
}
