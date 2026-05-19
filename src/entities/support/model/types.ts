import type { SupportRole } from '../../../../shared/mock/system-db';

export type { SupportRole };

export interface SupportUser {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  withdrawal_id: string | null;
  subject: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_role: 'user' | 'support';
  sender_name: string;
  text: string;
  created_at: string;
  attachments?: SupportMessageAttachment[];
  reaction?: SupportMessageReaction | null;
}

export interface SupportMessageAttachment {
  id: string;
  ticket_id: string;
  message_id: string | null;
  name: string;
  content_type: string;
  size: number;
  url: string;
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

export interface SupportStaffMember {
  id: string;
  username: string;
  role: SupportRole;
  created_at: string;
}
