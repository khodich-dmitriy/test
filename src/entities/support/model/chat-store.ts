import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { readSystemDb, withSystemDb } from '../../../../shared/mock/system-db';
import type {
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
  size: number;
  bytes: Uint8Array;
}

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

function toPublicAttachment(
  attachment: {
    id: string;
    ticket_id: string;
    message_id: string | null;
    name: string;
    content_type: string;
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
    size: attachment.size,
    url: toAttachmentUrl(attachment.id),
    created_at: attachment.created_at
  };
}

function enrichMessage(message: SupportMessage): SupportMessage {
  return readSystemDb((db) => ({
    ...message,
    attachments: db.message_attachments
      .filter((attachment) => attachment.message_id === message.id)
      .map(toPublicAttachment),
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
        reaction:
          db.message_reactions.find((reaction) => reaction.message_id === message.id) ??
          null
      }))
  );
}

function appendMessage(
  ticketId: string,
  senderRole: SupportMessage['sender_role'],
  senderName: string,
  text: string,
  attachmentIds: string[] = []
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
      created_at: createdAt
    };

    db.messages.push(message);
    for (const attachment of attachments) {
      attachment.message_id = message.id;
    }
    ticket.updated_at = createdAt;
    return {
      ...message,
      attachments: attachments.map(toPublicAttachment),
      reaction: null
    };
  });
}

export function appendUserMessage(
  ticketId: string,
  senderName: string,
  text: string,
  attachmentIds: string[] = []
): SupportMessage {
  return appendMessage(ticketId, 'user', senderName, text, attachmentIds);
}

export function appendSupportMessage(
  ticketId: string,
  senderName: string,
  text: string,
  attachmentIds: string[] = []
): SupportMessage {
  return appendMessage(ticketId, 'support', senderName, text, attachmentIds);
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
