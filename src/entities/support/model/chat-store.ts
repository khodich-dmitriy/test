import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { readSystemDb, withSystemDb } from '../../../../shared/mock/system-db';
import type {
  SupportChatEvent,
  SupportMessage,
  SupportMessageAttachment,
  SupportMessageReaction,
  SupportTicket
} from './types';

export class SupportAccessError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'SupportAccessError';
  }
}

export class SupportNotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'SupportNotFoundError';
  }
}

const SUPPORT_REACTION_EMOJIS = ['👍', '❤️', '🔥', '👏', '🎉', '😮'] as const;
const DEFAULT_ATTACHMENT_STORAGE_DIR = '/tmp/testfront-support-attachments';

interface UploadAttachmentInput {
  name: string;
  contentType: string;
  transcript?: string | null;
  size: number;
  bytes: Uint8Array;
}

const SUPPORT_INACTIVITY_MS = 10 * 60 * 1000;
const MAX_ACTIVE_TICKETS_PER_SUPPORT = 3;

function resolveAttachmentStorageDir(): string {
  return process.env.MOCK_SUPPORT_ATTACHMENT_DIR || DEFAULT_ATTACHMENT_STORAGE_DIR;
}

function ensureAttachmentStorageDir(): string {
  const dir = resolveAttachmentStorageDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function toAttachmentUrl(attachmentId: string): string {
  return `/v1/support/attachments/${attachmentId}`;
}

function resolveMediaType(contentType: string): SupportMessageAttachment['media_type'] {
  if (contentType.startsWith('image/')) {
    return 'image';
  }

  if (contentType.startsWith('audio/')) {
    return 'audio';
  }

  if (contentType.startsWith('video/')) {
    return 'video';
  }

  return 'file';
}

function toPublicAttachment(
  attachment: {
    id: string;
    ticket_id: string;
    message_id: string | null;
    name: string;
    content_type: string;
    media_type?: SupportMessageAttachment['media_type'];
    transcript?: string | null;
    size: number;
    created_at: string;
  }
): SupportMessageAttachment {
  return {
    id: attachment.id,
    ticket_id: attachment.ticket_id,
    message_id: attachment.message_id,
    name: attachment.name,
    content_type: attachment.content_type,
    media_type: attachment.media_type ?? resolveMediaType(attachment.content_type),
    transcript: attachment.transcript ?? null,
    size: attachment.size,
    url: toAttachmentUrl(attachment.id),
    created_at: attachment.created_at
  };
}

function toReply(message: SupportMessage | undefined | null) {
  if (!message) {
    return null;
  }

  return {
    id: message.id,
    sender_name: message.sender_name,
    text: message.text,
    created_at: message.created_at
  };
}

function enrichMessage(message: SupportMessage): SupportMessage {
  return readSystemDb((db) => ({
    ...message,
    attachments: db.message_attachments
      .filter((attachment) => attachment.message_id === message.id)
      .map(toPublicAttachment),
    reply_to: toReply(db.messages.find((item) => item.id === message.reply_to_message_id)),
    reaction:
      db.message_reactions.find((reaction) => reaction.message_id === message.id) ??
      null
  }));
}

export function getTicketById(ticketId: string): SupportTicket {
  const ticket = readSystemDb((db) => db.tickets.find((item) => item.id === ticketId));
  if (!ticket) {
    throw new SupportNotFoundError('Ticket not found');
  }

  return ticket;
}

export function getTicketByWithdrawalId(withdrawalId: string): SupportTicket {
  const ticket = readSystemDb((db) => db.tickets.find((item) => item.withdrawal_id === withdrawalId));
  if (!ticket) {
    throw new SupportNotFoundError('Ticket not found');
  }

  return ticket;
}

export function getOrCreateTicketByWithdrawalId(withdrawalId: string): SupportTicket {
  return withSystemDb((db) => {
    const existing = db.tickets.find((item) => item.withdrawal_id === withdrawalId);
    if (existing) {
      return existing;
    }

    const withdrawal = db.withdrawals.find((item) => item.id === withdrawalId);
    if (!withdrawal) {
      throw new SupportNotFoundError('Withdrawal not found');
    }

    const createdAt = new Date().toISOString();
    const ticket: SupportTicket = {
      id: `t_${globalThis.crypto.randomUUID()}`,
      user_id: withdrawal.user_id,
      withdrawal_id: withdrawal.id,
      subject: `Withdrawal ${withdrawal.id}`,
      status: 'open',
      support_state: 'active',
      assigned_staff_id: null,
      assigned_staff_username: null,
      last_activity_at: createdAt,
      created_at: createdAt,
      updated_at: createdAt
    };

    db.tickets.push(ticket);
    db.messages.push({
      id: `m_${globalThis.crypto.randomUUID()}`,
      ticket_id: ticket.id,
      sender_role: 'user',
      sender_name: 'demo',
      text: `Created withdrawal request for ${withdrawal.amount} to ${withdrawal.destination}`,
      reply_to_message_id: null,
      created_at: createdAt
    });
    addChatEvent(db, ticket.id, 'message', createdAt, {
      messageId: db.messages[db.messages.length - 1]?.id ?? null
    });

    return ticket;
  });
}

export function ensureTicketOwnedByUser(ticket: SupportTicket, userId: string): SupportTicket {
  if (ticket.user_id !== userId) {
    throw new SupportAccessError('Access denied');
  }

  return ticket;
}

export function listMessagesByTicketId(ticketId: string): SupportMessage[] {
  return readSystemDb((db) =>
    db.messages
      .filter((message) => message.ticket_id === ticketId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((message) => ({
        ...message,
        attachments: db.message_attachments
          .filter((attachment) => attachment.message_id === message.id)
          .map(toPublicAttachment),
        reply_to: toReply(db.messages.find((item) => item.id === message.reply_to_message_id)),
        reaction:
          db.message_reactions.find((reaction) => reaction.message_id === message.id) ??
          null
      }))
  );
}

function addChatEvent(
  db: Parameters<Parameters<typeof withSystemDb>[0]>[0],
  ticketId: string,
  type: 'message' | 'reaction' | 'assignment' | 'inactive',
  createdAt: string,
  options: { messageId?: string | null; reactionId?: string | null } = {}
) {
  db.chat_events.push({
    id: `evt_${globalThis.crypto.randomUUID()}`,
    ticket_id: ticketId,
    type,
    message_id: options.messageId ?? null,
    reaction_id: options.reactionId ?? null,
    created_at: createdAt
  });
}

function appendMessage(
  ticketId: string,
  senderRole: SupportMessage['sender_role'],
  senderName: string,
  text: string,
  attachmentIds: string[] = [],
  replyToMessageId: string | null = null
): SupportMessage {
  return withSystemDb((db) => {
    const ticket = db.tickets.find((item) => item.id === ticketId);
    if (!ticket) {
      throw new SupportNotFoundError('Ticket not found');
    }

    const normalizedText = text.trim();
    const uniqueAttachmentIds = [...new Set(attachmentIds.filter(Boolean))];
    const attachments = db.message_attachments.filter((attachment) =>
      uniqueAttachmentIds.includes(attachment.id)
    );

    if (!normalizedText && attachments.length === 0) {
      throw new Error('Message text or attachment is required');
    }

    if (attachments.length !== uniqueAttachmentIds.length) {
      throw new Error('Attachment not found');
    }

    if (
      attachments.some(
        (attachment) => attachment.ticket_id !== ticketId || attachment.message_id !== null
      )
    ) {
      throw new Error('Attachment is not available for this ticket');
    }

    const replyTo = replyToMessageId
      ? db.messages.find((message) => message.id === replyToMessageId && message.ticket_id === ticketId)
      : null;
    if (replyToMessageId && !replyTo) {
      throw new Error('Reply message not found');
    }

    const previousUpdatedAt = Date.parse(ticket.updated_at);
    const createdAt = new Date(
      Math.max(Date.now(), Number.isNaN(previousUpdatedAt) ? 0 : previousUpdatedAt + 1)
    ).toISOString();
    const message: SupportMessage = {
      id: `m_${globalThis.crypto.randomUUID()}`,
      ticket_id: ticketId,
      sender_role: senderRole,
      sender_name: senderName,
      text: normalizedText,
      reply_to_message_id: replyToMessageId,
      created_at: createdAt
    };

    db.messages.push(message);
    for (const attachment of attachments) {
      attachment.message_id = message.id;
    }
    ticket.updated_at = createdAt;
    ticket.last_activity_at = createdAt;
    ticket.support_state = 'active';
    addChatEvent(db, ticketId, 'message', createdAt, { messageId: message.id });
    return {
      ...message,
      attachments: attachments.map(toPublicAttachment),
      reply_to: toReply(replyTo),
      reaction: null
    };
  });
}

export function appendUserMessage(
  ticketId: string,
  senderName: string,
  text: string,
  attachmentIds: string[] = [],
  replyToMessageId: string | null = null
): SupportMessage {
  return appendMessage(ticketId, 'user', senderName, text, attachmentIds, replyToMessageId);
}

export function appendSupportMessage(
  ticketId: string,
  senderName: string,
  text: string,
  attachmentIds: string[] = [],
  replyToMessageId: string | null = null
): SupportMessage {
  return appendMessage(ticketId, 'support', senderName, text, attachmentIds, replyToMessageId);
}

export function uploadTicketAttachments(
  ticketId: string,
  files: UploadAttachmentInput[]
): SupportMessageAttachment[] {
  return withSystemDb((db) => {
    const ticket = db.tickets.find((item) => item.id === ticketId);
    if (!ticket) {
      throw new SupportNotFoundError('Ticket not found');
    }

    if (files.length === 0) {
      throw new Error('No files selected');
    }

    const storageDir = ensureAttachmentStorageDir();
    const createdAt = new Date().toISOString();
    const attachments = files.map((file) => {
      const id = `att_${globalThis.crypto.randomUUID()}`;
      const storageKey = `${id}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
      writeFileSync(path.join(storageDir, storageKey), file.bytes);

      return {
        id,
        ticket_id: ticketId,
        message_id: null,
        name: file.name,
        content_type: file.contentType || 'application/octet-stream',
        media_type: resolveMediaType(file.contentType || 'application/octet-stream'),
        transcript: file.transcript?.trim() || null,
        size: file.size,
        storage_key: storageKey,
        created_at: createdAt
      };
    });

    db.message_attachments.push(...attachments);
    return attachments.map(toPublicAttachment);
  });
}

export function getAttachmentById(attachmentId: string) {
  const attachment = readSystemDb((db) =>
    db.message_attachments.find((item) => item.id === attachmentId)
  );
  if (!attachment) {
    throw new SupportNotFoundError('Attachment not found');
  }

  return {
    ...toPublicAttachment(attachment),
    storage_key: attachment.storage_key
  };
}

export function readAttachmentBytes(storageKey: string): Uint8Array {
  const filePath = path.join(resolveAttachmentStorageDir(), storageKey);
  if (!existsSync(filePath)) {
    throw new SupportNotFoundError('Attachment not found');
  }

  return readFileSync(filePath);
}

export function ensureAttachmentReadableByUser(attachmentId: string, userId: string) {
  const attachment = getAttachmentById(attachmentId);
  const ticket = ensureTicketOwnedByUser(getTicketById(attachment.ticket_id), userId);
  return { attachment, ticket };
}

export function setMessageReaction(
  messageId: string,
  actorRole: SupportMessage['sender_role'],
  actorName: string,
  emoji: string
): SupportMessageReaction {
  if (!SUPPORT_REACTION_EMOJIS.includes(emoji as (typeof SUPPORT_REACTION_EMOJIS)[number])) {
    throw new Error('Unsupported reaction');
  }

  return withSystemDb((db) => {
    const message = db.messages.find((item) => item.id === messageId);
    if (!message) {
      throw new SupportNotFoundError('Message not found');
    }

    const now = new Date().toISOString();
    const existing = db.message_reactions.find((reaction) => reaction.message_id === messageId);
    if (existing) {
      existing.emoji = emoji;
      existing.actor_role = actorRole;
      existing.actor_name = actorName;
      existing.updated_at = now;
      addChatEvent(db, message.ticket_id, 'reaction', now, {
        messageId,
        reactionId: existing.id
      });
      return existing;
    }

    const created: SupportMessageReaction = {
      id: `react_${globalThis.crypto.randomUUID()}`,
      message_id: messageId,
      emoji,
      actor_role: actorRole,
      actor_name: actorName,
      created_at: now,
      updated_at: now
    };
    db.message_reactions.push(created);
    addChatEvent(db, message.ticket_id, 'reaction', now, {
      messageId,
      reactionId: created.id
    });
    return created;
  });
}

export function getMessageById(messageId: string): SupportMessage {
  const message = readSystemDb((db) => db.messages.find((item) => item.id === messageId));
  if (!message) {
    throw new SupportNotFoundError('Message not found');
  }

  return enrichMessage(message);
}

export function listChatEventsByTicketId(ticketId: string): SupportChatEvent[] {
  return readSystemDb((db) =>
    db.chat_events
      .filter((event) => event.ticket_id === ticketId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((event) => ({
        id: event.id,
        ticket_id: event.ticket_id,
        type: event.type,
        message: event.message_id
          ? enrichMessage(db.messages.find((message) => message.id === event.message_id) as SupportMessage)
          : null,
        reaction: event.reaction_id
          ? db.message_reactions.find((reaction) => reaction.id === event.reaction_id) ?? null
          : null,
        ticket: db.tickets.find((ticket) => ticket.id === event.ticket_id) ?? null,
        created_at: event.created_at
      }))
  );
}

export function assignTicketToAvailableSupport(ticketId: string): SupportTicket {
  return withSystemDb((db) => {
    const ticket = db.tickets.find((item) => item.id === ticketId);
    if (!ticket) {
      throw new SupportNotFoundError('Ticket not found');
    }

    if (ticket.assigned_staff_id) {
      return ticket;
    }

    const supportStaff = db.staff
      .filter((staff) => staff.role === 'support' || staff.role === 'admin')
      .sort((left, right) => {
        if (left.role !== right.role) {
          return left.role === 'support' ? -1 : 1;
        }

        return left.created_at.localeCompare(right.created_at);
      });
    const selected = supportStaff
      .map((staff) => ({
        staff,
        activeCount: db.tickets.filter(
          (item) => item.assigned_staff_id === staff.id && item.support_state !== 'inactive' && item.status === 'open'
        ).length
      }))
      .find((candidate) => candidate.activeCount < MAX_ACTIVE_TICKETS_PER_SUPPORT);

    if (!selected) {
      throw new Error('No support staff available');
    }

    const now = new Date().toISOString();
    ticket.assigned_staff_id = selected.staff.id;
    ticket.assigned_staff_username = selected.staff.username;
    ticket.support_state = 'active';
    ticket.last_activity_at = ticket.last_activity_at ?? ticket.updated_at;
    ticket.updated_at = now;
    addChatEvent(db, ticketId, 'assignment', now);
    return ticket;
  });
}

export function markInactiveSupportTickets(nowIso = new Date().toISOString()): SupportTicket[] {
  return withSystemDb((db) => {
    const now = Date.parse(nowIso);
    const changed: SupportTicket[] = [];

    for (const ticket of db.tickets) {
      const lastActivity = Date.parse(ticket.last_activity_at ?? ticket.updated_at);
      if (
        ticket.status === 'open' &&
        ticket.support_state !== 'inactive' &&
        !Number.isNaN(lastActivity) &&
        now - lastActivity >= SUPPORT_INACTIVITY_MS
      ) {
        ticket.support_state = 'inactive';
        ticket.updated_at = nowIso;
        addChatEvent(db, ticket.id, 'inactive', nowIso);
        changed.push(ticket);
      }
    }

    return changed;
  });
}
