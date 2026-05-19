import type { SupportMessage } from './types';

type MessageHandler = (message: SupportMessage) => void;

const listenersByTicketId = new Map<string, Set<MessageHandler>>();

export function subscribeToTicketMessages(ticketId: string, handler: MessageHandler): () => void {
  const listeners = listenersByTicketId.get(ticketId) ?? new Set<MessageHandler>();
  listeners.add(handler);
  listenersByTicketId.set(ticketId, listeners);

  return () => {
    const current = listenersByTicketId.get(ticketId);
    if (!current) {
      return;
    }

    current.delete(handler);
    if (current.size === 0) {
      listenersByTicketId.delete(ticketId);
    }
  };
}

export function publishTicketMessage(ticketId: string, message: SupportMessage): void {
  const listeners = listenersByTicketId.get(ticketId);
  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    listener(message);
  }
}

