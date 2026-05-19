import { NextResponse } from 'next/server';

import { getDefaultSystemUserId } from '../../../../shared/mock/system-db';
import { isAuthenticatedRequest } from '../../../entities/session/model/auth';
import {
  ensureTicketOwnedByUser,
  getTicketById,
  listChatEventsByTicketId,
  SupportAccessError,
  SupportNotFoundError
} from '../../../entities/support/model/chat-store';
import type { SupportChatEvent } from '../../../entities/support/model/types';
import { unauthorizedResponse } from '../withdrawals/response';

type StreamAuthMode = 'access-cookie' | 'support-session';

interface StreamTicketMessagesOptions {
  authMode?: StreamAuthMode;
  hasSupportAccess?: (request: Request) => boolean;
}

function hasStreamAccess(request: Request, options: Required<StreamTicketMessagesOptions>): boolean {
  const { authMode, hasSupportAccess } = options;

  if (authMode === 'support-session') {
    return hasSupportAccess(request);
  }

  return isAuthenticatedRequest(request);
}

function resolveTicket(ticketId: string, authMode: StreamAuthMode) {
  if (authMode === 'support-session') {
    return getTicketById(ticketId);
  }

  return ensureTicketOwnedByUser(getTicketById(ticketId), getDefaultSystemUserId());
}

function buildSseChatEvent(event: SupportChatEvent): Uint8Array {
  const encoder = new TextEncoder();
  const data = event.type === 'message' && event.message ? event.message : event;
  return encoder.encode(`id: ${event.id}\nretry: 1000\nevent: ${event.type}\ndata: ${JSON.stringify(data)}\n\n`);
}

function buildComment(comment: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`: ${comment}\n\n`);
}

export async function handleStreamTicketMessages(
  request: Request,
  ticketId: string,
  options: StreamTicketMessagesOptions = {}
) {
  const streamOptions = {
    authMode: options.authMode ?? 'access-cookie',
    hasSupportAccess: options.hasSupportAccess ?? (() => false)
  };
  const { authMode } = streamOptions;

  if (!hasStreamAccess(request, streamOptions)) {
    return unauthorizedResponse();
  }

  try {
    const ticket = resolveTicket(ticketId, authMode);
    let pollId: ReturnType<typeof setInterval> | null = null;
    let keepAliveId: ReturnType<typeof setInterval> | null = null;
    let closed = false;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const cleanup = () => {
          if (pollId) {
            clearInterval(pollId);
            pollId = null;
          }

          if (keepAliveId) {
            clearInterval(keepAliveId);
            keepAliveId = null;
          }
        };

        const closeStream = () => {
          if (closed) {
            return;
          }

          closed = true;
          cleanup();
          controller.close();
        };

        controller.enqueue(buildComment('connected'));

        const lastEventId = request.headers.get('last-event-id');
        let lastSeenId = lastEventId && lastEventId.length > 0 ? lastEventId : listChatEventsByTicketId(ticket.id).at(-1)?.id ?? null;

        const emitNewEvents = () => {
          try {
            resolveTicket(ticketId, authMode);
          } catch {
            closeStream();
            return;
          }

          const events = listChatEventsByTicketId(ticket.id);
          const lastIndex = lastSeenId
            ? events.findIndex((event) => event.id === lastSeenId)
            : events.length - 1;
          const delta = lastIndex >= 0 ? events.slice(lastIndex + 1) : events;

          if (delta.length) {
            for (const event of delta) {
              controller.enqueue(buildSseChatEvent(event));
            }

            lastSeenId = delta[delta.length - 1]?.id ?? lastSeenId;
          }
        };

        emitNewEvents();

        pollId = setInterval(emitNewEvents, 500);
        keepAliveId = setInterval(() => {
          if (closed) {
            return;
          }

          controller.enqueue(buildComment('keep-alive'));
        }, 15000);
      },
      cancel() {
        closed = true;
        if (pollId) {
          clearInterval(pollId);
          pollId = null;
        }

        if (keepAliveId) {
          clearInterval(keepAliveId);
          keepAliveId = null;
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    });
  } catch (error) {
    if (error instanceof SupportNotFoundError) {
      return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
    }

    if (error instanceof SupportAccessError) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
