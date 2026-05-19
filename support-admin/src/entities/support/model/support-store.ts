import {
  readSystemDb,
  withSystemDb
} from '../../../../../shared/mock/system-db';
import {
  appendSupportMessage as appendSharedSupportMessage,
  ensureTicketOwnedByUser,
  getAttachmentById,
  getMessageById,
  getTicketById as getSharedTicketById,
  getTicketByWithdrawalId,
  listMessagesByTicketId as listSharedMessagesByTicketId,
  readAttachmentBytes,
  setMessageReaction,
  SupportAccessError,
  SupportNotFoundError,
  uploadTicketAttachments
} from '../../../../../src/entities/support/model/chat-store';
import type { SupportMessage, SupportStaffMember, SupportTicket, SupportUser } from './types';

export {
  getAttachmentById,
  getMessageById,
  getTicketByWithdrawalId,
  readAttachmentBytes,
  setMessageReaction,
  SupportAccessError,
  SupportNotFoundError,
  uploadTicketAttachments
};

export function listSupportUsers(): SupportUser[] {
  return readSystemDb((db) =>
    [...db.users].sort((a, b) => b.created_at.localeCompare(a.created_at))
  );
}

export function getSupportUserById(userId: string): SupportUser {
  const user = readSystemDb((db) => db.users.find((item) => item.id === userId));
  if (!user) {
    throw new SupportNotFoundError('User not found');
  }
  return user;
}

export function listTicketsByUserId(userId: string): SupportTicket[] {
  return readSystemDb((db) =>
    db.tickets
      .filter((ticket) => ticket.user_id === userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  );
}

export function getTicketById(ticketId: string): SupportTicket {
  return getSharedTicketById(ticketId);
}

export function getTicketByWithdrawalIdForUser(withdrawalId: string, userId: string): SupportTicket {
  return ensureTicketOwnedByUser(getTicketByWithdrawalId(withdrawalId), userId);
}

export function listMessagesByTicketId(ticketId: string): SupportMessage[] {
  return listSharedMessagesByTicketId(ticketId);
}

export function appendSupportMessage(
  ticketId: string,
  senderName: string,
  text: string,
  attachmentIds: string[] = []
): SupportMessage {
  return appendSharedSupportMessage(ticketId, senderName, text, attachmentIds);
}

export function listSupportStaff(): SupportStaffMember[] {
  return readSystemDb((db) =>
    [...db.staff].sort((a, b) => b.created_at.localeCompare(a.created_at))
  );
}

export function addSupportStaff(username: string): SupportStaffMember {
  return withSystemDb((db) => {
    const normalized = username.trim().toLowerCase();
    if (!normalized) {
      throw new Error('Username is required');
    }

    const duplicate = db.staff.find((item) => item.username.toLowerCase() === normalized);
    if (duplicate) {
      throw new Error('Staff user already exists');
    }

    const created: SupportStaffMember = {
      id: `staff_${globalThis.crypto.randomUUID()}`,
      username: normalized,
      role: 'support',
      created_at: new Date().toISOString()
    };

    db.staff.push(created);
    return created;
  });
}
