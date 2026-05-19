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
  support_state?: 'active' | 'inactive';
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
  reply_to?: SupportMessageReply | null;
  created_at: string;
  attachments?: SupportMessageAttachment[];
  reaction?: SupportMessageReaction | null;
}

export interface SupportMessageReply {
  id: string;
  sender_name: string;
  text: string;
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

export interface SupportChatEvent {
  id: string;
  ticket_id: string;
  type: 'message' | 'reaction' | 'assignment' | 'inactive';
  message?: SupportMessage | null;
  reaction?: SupportMessageReaction | null;
  ticket?: SupportTicket | null;
  created_at: string;
}
