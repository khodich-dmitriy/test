# Support Admin Redesign And Withdraw Ticket Chat Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Перевести админку на цельный UI shell и добавить пользователю чат поддержки с SSE на `/withdraw/[id]` по конкретной заявке.

**Architecture:** Поддержка чата строится на общем файловом mock-хранилище (`shared/mock/system-db.ts`) и DB-backed SSE (poll + delta emit), чтобы realtime работал между двумя процессами (`:3000` и `:3001`). UI админки реорганизуется через общий shell + CSS modules без инлайн-стилей. Пользовательский чат добавляется в `withdraw-details` как отдельный feature-компонент.

**Tech Stack:** Next.js App Router, React 18, TypeScript, CSS Modules, Vitest + Testing Library, SSE (`EventSource`), shared mock DB.

---

**Execution rules:** @test-driven-development, @verification-before-completion, @systematic-debugging (если любой тест/роут ведет себя не по ожиданиям).

### Task 1: Shared Support Chat Domain Helpers

**Files:**
- Create: `src/entities/support/model/types.ts`
- Create: `src/entities/support/model/chat-store.ts`
- Modify: `support-admin/src/entities/support/model/support-store.ts`
- Test: `tests/shared-support-store.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { readSystemDb } from '@/shared/mock/system-db';
import { createWithdrawal, resetMockWithdrawals } from '@/src/entities/withdrawal/model/mock-withdrawal-store';
import {
  appendUserTicketMessage,
  getTicketByWithdrawalId,
  isTicketOwnedByUser,
  listMessagesByTicketId
} from '@/src/entities/support/model/chat-store';

describe('shared chat-store', () => {
  it('resolves ticket by withdrawal and appends user message', () => {
    resetMockWithdrawals();

    const created = createWithdrawal({ amount: 120, destination: 'wallet-x', idempotencyKey: 'chat-shared-1' });
    const ticket = getTicketByWithdrawalId(created.id);

    expect(ticket).toBeDefined();
    expect(isTicketOwnedByUser(ticket.id, 'user_demo')).toBe(true);

    appendUserTicketMessage(ticket.id, 'demo', 'Need status update');

    const messages = listMessagesByTicketId(ticket.id);
    expect(messages.at(-1)?.sender_role).toBe('user');
    expect(messages.at(-1)?.text).toBe('Need status update');

    const updatedTicket = readSystemDb((db) => db.tickets.find((item) => item.id === ticket.id));
    expect(updatedTicket?.updated_at).toBe(messages.at(-1)?.created_at);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/shared-support-store.test.ts`
Expected: FAIL with missing module/functions from `chat-store.ts`.

**Step 3: Write minimal implementation**

```ts
// src/entities/support/model/chat-store.ts
import { readSystemDb, withSystemDb } from '@/shared/mock/system-db';
import type { SupportMessage, SupportTicket } from '@/src/entities/support/model/types';

export function getTicketByWithdrawalId(withdrawalId: string): SupportTicket | null {
  return readSystemDb((db) => db.tickets.find((item) => item.withdrawal_id === withdrawalId) ?? null);
}

export function listMessagesByTicketId(ticketId: string): SupportMessage[] {
  return readSystemDb((db) =>
    db.messages
      .filter((item) => item.ticket_id === ticketId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  );
}

export function isTicketOwnedByUser(ticketId: string, userId: string): boolean {
  return readSystemDb((db) => db.tickets.some((item) => item.id === ticketId && item.user_id === userId));
}

export function appendUserTicketMessage(ticketId: string, senderName: string, text: string): SupportMessage {
  return withSystemDb((db) => {
    const ticket = db.tickets.find((item) => item.id === ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new Error('Message text is required');
    }

    const createdAt = new Date().toISOString();
    const message: SupportMessage = {
      id: `m_${globalThis.crypto.randomUUID()}`,
      ticket_id: ticketId,
      sender_role: 'user',
      sender_name: senderName,
      text: normalizedText,
      created_at: createdAt
    };

    db.messages.push(message);
    ticket.updated_at = createdAt;
    return message;
  });
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/shared-support-store.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/entities/support/model/types.ts src/entities/support/model/chat-store.ts support-admin/src/entities/support/model/support-store.ts tests/shared-support-store.test.ts
git commit -m "Add shared support chat store helpers"
```

### Task 2: Message Delta Reader For DB-Backed SSE

**Files:**
- Create: `src/entities/support/model/message-delta.ts`
- Test: `tests/support-message-delta.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { collectMessageDelta } from '@/src/entities/support/model/message-delta';

describe('message delta', () => {
  it('returns only unseen messages by last message id', () => {
    const all = [
      { id: 'm_1', text: 'a' },
      { id: 'm_2', text: 'b' },
      { id: 'm_3', text: 'c' }
    ];

    expect(collectMessageDelta(all, null).map((item) => item.id)).toEqual(['m_1', 'm_2', 'm_3']);
    expect(collectMessageDelta(all, 'm_2').map((item) => item.id)).toEqual(['m_3']);
    expect(collectMessageDelta(all, 'm_missing').map((item) => item.id)).toEqual(['m_1', 'm_2', 'm_3']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/support-message-delta.test.ts`
Expected: FAIL because `collectMessageDelta` does not exist.

**Step 3: Write minimal implementation**

```ts
export interface MessageLike {
  id: string;
}

export function collectMessageDelta<T extends MessageLike>(messages: T[], lastSeenId: string | null): T[] {
  if (!lastSeenId) {
    return messages;
  }

  const index = messages.findIndex((item) => item.id === lastSeenId);
  if (index === -1) {
    return messages;
  }

  return messages.slice(index + 1);
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/support-message-delta.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/entities/support/model/message-delta.ts tests/support-message-delta.test.ts
git commit -m "Add message delta helper for SSE polling"
```

### Task 3: Withdraw-App Support Routes (Ticket Fetch + User Send + SSE)

**Files:**
- Create: `src/app/api/support/get-withdrawal-ticket-handler.ts`
- Create: `src/app/api/support/post-user-ticket-message-handler.ts`
- Create: `src/app/api/support/stream-ticket-messages-handler.ts`
- Create: `withdraw-app/app/v1/support/withdrawals/[withdrawalId]/ticket/route.ts`
- Create: `withdraw-app/app/v1/support/tickets/[ticketId]/messages/route.ts`
- Create: `withdraw-app/app/v1/support/tickets/[ticketId]/stream/route.ts`
- Test: `tests/withdraw-support-routes.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { createWithdrawal, resetMockWithdrawals } from '@/src/entities/withdrawal/model/mock-withdrawal-store';
import { GET as getWithdrawalTicket } from '@/withdraw-app/app/v1/support/withdrawals/[withdrawalId]/ticket/route';
import { POST as postUserMessage } from '@/withdraw-app/app/v1/support/tickets/[ticketId]/messages/route';

describe('withdraw support routes', () => {
  it('returns ticket and allows user message for own withdrawal', async () => {
    resetMockWithdrawals();
    const created = createWithdrawal({ amount: 77, destination: 'wallet-user-chat', idempotencyKey: 'user-chat-k-1' });

    const getResponse = await getWithdrawalTicket(
      new Request(`http://localhost/v1/support/withdrawals/${created.id}/ticket`, {
        headers: { cookie: 'mock_access_token=access_ok' }
      }),
      { params: Promise.resolve({ withdrawalId: created.id }) }
    );

    expect(getResponse.status).toBe(200);
    const payload = await getResponse.json();
    expect(payload.ticket.withdrawal_id).toBe(created.id);

    const postResponse = await postUserMessage(
      new Request(`http://localhost/v1/support/tickets/${payload.ticket.id}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: 'mock_access_token=access_ok'
        },
        body: JSON.stringify({ text: 'Please update me' })
      }),
      { params: Promise.resolve({ ticketId: payload.ticket.id }) }
    );

    expect(postResponse.status).toBe(201);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/withdraw-support-routes.test.ts`
Expected: FAIL because new route handlers do not exist.

**Step 3: Write minimal implementation**

```ts
// src/app/api/support/get-withdrawal-ticket-handler.ts
import { NextResponse } from 'next/server';
import { hasSessionRequest } from '@/src/entities/session/model/auth';
import { getTicketByWithdrawalId, listMessagesByTicketId, isTicketOwnedByUser } from '@/src/entities/support/model/chat-store';
import { getDefaultSystemUserId } from '@/shared/mock/system-db';

export async function handleGetWithdrawalTicket(request: Request, withdrawalId: string) {
  if (!hasSessionRequest(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const ticket = getTicketByWithdrawalId(withdrawalId);
  if (!ticket) {
    return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
  }

  if (!isTicketOwnedByUser(ticket.id, getDefaultSystemUserId())) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ ticket, messages: listMessagesByTicketId(ticket.id) }, { status: 200 });
}
```

```ts
// withdraw-app/app/v1/support/withdrawals/[withdrawalId]/ticket/route.ts
import { handleGetWithdrawalTicket } from '@/src/app/api/support/get-withdrawal-ticket-handler';

export async function GET(request: Request, { params }: { params: Promise<{ withdrawalId: string }> }) {
  const { withdrawalId } = await params;
  return handleGetWithdrawalTicket(request, withdrawalId);
}
```

```ts
// src/app/api/support/post-user-ticket-message-handler.ts
import { NextResponse } from 'next/server';
import { hasSessionRequest } from '@/src/entities/session/model/auth';
import { appendUserTicketMessage, isTicketOwnedByUser } from '@/src/entities/support/model/chat-store';
import { getDefaultSystemUserId } from '@/shared/mock/system-db';

export async function handlePostUserTicketMessage(request: Request, ticketId: string) {
  if (!hasSessionRequest(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!isTicketOwnedByUser(ticketId, getDefaultSystemUserId())) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const payload = (await request.json()) as { text?: string };
  const message = appendUserTicketMessage(ticketId, 'demo', payload.text ?? '');
  return NextResponse.json(message, { status: 201 });
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/withdraw-support-routes.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/api/support/get-withdrawal-ticket-handler.ts src/app/api/support/post-user-ticket-message-handler.ts src/app/api/support/stream-ticket-messages-handler.ts withdraw-app/app/v1/support/withdrawals/[withdrawalId]/ticket/route.ts withdraw-app/app/v1/support/tickets/[ticketId]/messages/route.ts withdraw-app/app/v1/support/tickets/[ticketId]/stream/route.ts tests/withdraw-support-routes.test.ts
git commit -m "Add withdraw support chat API routes"
```

### Task 4: DB-Backed SSE Route Implementation In Both Apps

**Files:**
- Modify: `src/app/api/support/stream-ticket-messages-handler.ts`
- Modify: `withdraw-app/app/v1/support/tickets/[ticketId]/stream/route.ts`
- Modify: `support-admin/app/v1/support/tickets/[ticketId]/stream/route.ts`
- Modify: `support-admin/app/v1/support/tickets/[ticketId]/messages/route.ts`
- Modify: `support-admin/src/entities/support/model/sse-broker.ts`
- Test: `tests/support-admin-ticket-chat-page.test.tsx`

**Step 1: Write the failing test**

```ts
it('keeps dedup behavior when stream sends repeated payload ids', () => {
  // existing test body in tests/support-admin-ticket-chat-page.test.tsx
  // add one more assertion that repeated id from polling-backed stream is still rendered once
  expect(screen.getAllByText(/Hello from support/i)).toHaveLength(1);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/support-admin-ticket-chat-page.test.tsx`
Expected: FAIL after switching stream payload format or event path until page parser is aligned.

**Step 3: Write minimal implementation**

```ts
// src/app/api/support/stream-ticket-messages-handler.ts
import { listMessagesByTicketId } from '@/src/entities/support/model/chat-store';
import { collectMessageDelta } from '@/src/entities/support/model/message-delta';

export async function handleStreamTicketMessages(ticketId: string) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let lastSeenId: string | null = null;

      const writeDelta = () => {
        if (closed) return;

        const all = listMessagesByTicketId(ticketId);
        const delta = collectMessageDelta(all, lastSeenId);
        for (const message of delta) {
          controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(message)}\n\n`));
          lastSeenId = message.id;
        }
      };

      controller.enqueue(encoder.encode(': connected\n\n'));
      writeDelta();

      const pollId = setInterval(writeDelta, 1000);
      const keepAliveId = setInterval(() => {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
      }, 15000);

      return () => {
        closed = true;
        clearInterval(pollId);
        clearInterval(keepAliveId);
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
```

```ts
// support-admin/app/v1/support/tickets/[ticketId]/stream/route.ts
import { handleStreamTicketMessages } from '@/src/app/api/support/stream-ticket-messages-handler';

export async function GET(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  return handleStreamTicketMessages(ticketId);
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/support-admin-ticket-chat-page.test.tsx tests/withdraw-support-routes.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/api/support/stream-ticket-messages-handler.ts withdraw-app/app/v1/support/tickets/[ticketId]/stream/route.ts support-admin/app/v1/support/tickets/[ticketId]/stream/route.ts support-admin/app/v1/support/tickets/[ticketId]/messages/route.ts support-admin/src/entities/support/model/sse-broker.ts tests/support-admin-ticket-chat-page.test.tsx
git commit -m "Switch support SSE to DB-backed stream polling"
```

### Task 5: User Chat UI On Withdraw Details Page

**Files:**
- Create: `src/features/support/chat/ui/withdraw-ticket-chat.tsx`
- Create: `src/features/support/chat/ui/withdraw-ticket-chat.module.css`
- Modify: `src/views/withdraw-details/ui/withdraw-details-page.tsx`
- Modify: `src/views/withdraw-details/ui/withdraw-details-page.module.css`
- Modify: `src/shared/config/test-ids.ts`
- Test: `tests/withdraw-ticket-chat.test.tsx`
- Test: `tests/withdraw-details-page.test.tsx`

**Step 1: Write the failing test**

```ts
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WithdrawTicketChat } from '@/src/features/support/chat/ui/withdraw-ticket-chat';

class MockEventSource {
  constructor(_url: string) {}
  addEventListener() {}
  close() {}
}

describe('withdraw ticket chat', () => {
  it('loads ticket chat and renders message list', async () => {
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        ticket: { id: 't_1', withdrawal_id: 'w_1' },
        messages: [{ id: 'm_1', sender_name: 'support', sender_role: 'support', text: 'Hello', created_at: '2026-04-19T00:00:00.000Z', ticket_id: 't_1' }]
      }), { status: 200 })
    ));

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    expect(await screen.findByText('Hello')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/withdraw-ticket-chat.test.tsx`
Expected: FAIL because component does not exist.

**Step 3: Write minimal implementation**

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

interface TicketPayload {
  ticket: { id: string };
  messages: Array<{
    id: string;
    ticket_id: string;
    sender_role: 'user' | 'support';
    sender_name: string;
    text: string;
    created_at: string;
  }>;
}

export function WithdrawTicketChat({ withdrawalId }: { withdrawalId: string }) {
  const [payload, setPayload] = useState<TicketPayload | null>(null);

  useEffect(() => {
    let isDisposed = false;

    const load = async () => {
      const response = await fetch(`/v1/support/withdrawals/${withdrawalId}/ticket`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as TicketPayload;
      if (!isDisposed) {
        setPayload(data);
      }

      const eventSource = new EventSource(`/v1/support/tickets/${data.ticket.id}/stream`);
      eventSource.addEventListener('message', (event) => {
        const next = JSON.parse(event.data) as TicketPayload['messages'][number];
        setPayload((current) => {
          if (!current || current.messages.some((item) => item.id === next.id)) {
            return current;
          }
          return { ...current, messages: [...current.messages, next] };
        });
      });

      return () => eventSource.close();
    };

    void load();
    return () => {
      isDisposed = true;
    };
  }, [withdrawalId]);

  const messages = useMemo(() => payload?.messages ?? [], [payload]);

  return (
    <section>
      <h2>Support chat</h2>
      <ul>
        {messages.map((message) => (
          <li key={message.id}>{message.sender_name}: {message.text}</li>
        ))}
      </ul>
    </section>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/withdraw-ticket-chat.test.tsx tests/withdraw-details-page.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/support/chat/ui/withdraw-ticket-chat.tsx src/features/support/chat/ui/withdraw-ticket-chat.module.css src/views/withdraw-details/ui/withdraw-details-page.tsx src/views/withdraw-details/ui/withdraw-details-page.module.css src/shared/config/test-ids.ts tests/withdraw-ticket-chat.test.tsx tests/withdraw-details-page.test.tsx
git commit -m "Add SSE support chat to withdraw details page"
```

### Task 6: Admin Shell And Global Visual Tokens

**Files:**
- Modify: `support-admin/app/layout.tsx`
- Modify: `support-admin/app/globals.css`
- Create: `support-admin/src/widgets/admin-shell/ui/admin-shell.tsx`
- Create: `support-admin/src/widgets/admin-shell/ui/admin-shell.module.css`
- Create: `support-admin/src/features/auth/logout/ui/support-logout-button.tsx`
- Test: `tests/support-admin-shell.test.tsx`

**Step 1: Write the failing test**

```ts
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminShell } from '@/support-admin/src/widgets/admin-shell/ui/admin-shell';

describe('admin shell', () => {
  it('renders navigation links and content slot', () => {
    render(
      <AdminShell username="support" role="support">
        <div>content</div>
      </AdminShell>
    );

    expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/support-admin-shell.test.tsx`
Expected: FAIL because `AdminShell` does not exist.

**Step 3: Write minimal implementation**

```tsx
import Link from 'next/link';

export function AdminShell({
  children,
  username,
  role
}: {
  children: React.ReactNode;
  username: string;
  role: 'admin' | 'support';
}) {
  return (
    <div className="adminShell">
      <aside>
        <Link href="/users">Users</Link>
        {role === 'admin' ? <Link href="/staff">Staff</Link> : null}
      </aside>
      <main>
        <header>{username} ({role})</header>
        {children}
      </main>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/support-admin-shell.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add support-admin/app/layout.tsx support-admin/app/globals.css support-admin/src/widgets/admin-shell/ui/admin-shell.tsx support-admin/src/widgets/admin-shell/ui/admin-shell.module.css support-admin/src/features/auth/logout/ui/support-logout-button.tsx tests/support-admin-shell.test.tsx
git commit -m "Add support admin shell and design tokens"
```

### Task 7: Redesign Users And Ticket Chat Screens

**Files:**
- Modify: `support-admin/src/views/users/ui/users-page.tsx`
- Create: `support-admin/src/views/users/ui/users-page.module.css`
- Modify: `support-admin/src/views/user-details/ui/user-details-page.tsx`
- Create: `support-admin/src/views/user-details/ui/user-details-page.module.css`
- Modify: `support-admin/src/views/ticket-chat/ui/ticket-chat-page.tsx`
- Create: `support-admin/src/views/ticket-chat/ui/ticket-chat-page.module.css`
- Modify: `support-admin/src/features/chat/send/ui/send-message-form.tsx`
- Create: `support-admin/src/features/chat/send/ui/send-message-form.module.css`
- Test: `tests/support-admin-ticket-chat-page.test.tsx`

**Step 1: Write the failing test**

```ts
it('renders support and user messages in separate lanes', () => {
  render(<TicketChatPage ... />);

  const userMessage = screen.getByText(/Created withdrawal request/i).closest('li');
  const supportMessage = screen.getByText(/Hello from support/i).closest('li');

  expect(userMessage).toHaveAttribute('data-role', 'user');
  expect(supportMessage).toHaveAttribute('data-role', 'support');
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/support-admin-ticket-chat-page.test.tsx`
Expected: FAIL because message lane attributes/styles are absent.

**Step 3: Write minimal implementation**

```tsx
<li
  key={message.id}
  data-role={message.sender_role}
  className={message.sender_role === 'support' ? styles.supportMessage : styles.userMessage}
>
  <p className={styles.sender}>{message.sender_name}</p>
  <p className={styles.text}>{message.text}</p>
</li>
```

```css
.userMessage {
  justify-self: start;
  background: #f7fafc;
}

.supportMessage {
  justify-self: end;
  background: #e7f1ff;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/support-admin-ticket-chat-page.test.tsx tests/support-admin-routes.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add support-admin/src/views/users/ui/users-page.tsx support-admin/src/views/users/ui/users-page.module.css support-admin/src/views/user-details/ui/user-details-page.tsx support-admin/src/views/user-details/ui/user-details-page.module.css support-admin/src/views/ticket-chat/ui/ticket-chat-page.tsx support-admin/src/views/ticket-chat/ui/ticket-chat-page.module.css support-admin/src/features/chat/send/ui/send-message-form.tsx support-admin/src/features/chat/send/ui/send-message-form.module.css tests/support-admin-ticket-chat-page.test.tsx
git commit -m "Redesign support users and ticket chat screens"
```

### Task 8: Redesign Staff And Login Screens

**Files:**
- Modify: `support-admin/src/views/staff/ui/staff-page.tsx`
- Create: `support-admin/src/views/staff/ui/staff-page.module.css`
- Modify: `support-admin/src/features/staff/add/ui/add-staff-form.tsx`
- Create: `support-admin/src/features/staff/add/ui/add-staff-form.module.css`
- Modify: `support-admin/src/views/login/ui/login-page.tsx`
- Create: `support-admin/src/views/login/ui/login-page.module.css`
- Modify: `support-admin/src/features/auth/login/ui/login-form.tsx`
- Create: `support-admin/src/features/auth/login/ui/login-form.module.css`
- Test: `tests/support-admin-staff-page.test.tsx`

**Step 1: Write the failing test**

```ts
it('keeps add-staff flow and shows refreshed list item in styled layout', async () => {
  render(<StaffPage initialStaff={[createStaffItem('staff_1', 'support')]} />);
  // existing flow from support-admin-staff-page.test.tsx
  // add assertion for new semantic heading/card landmark
  expect(screen.getByRole('heading', { name: /support staff/i })).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/support-admin-staff-page.test.tsx`
Expected: FAIL if new semantic structure is missing.

**Step 3: Write minimal implementation**

```tsx
<main className={styles.page}>
  <section className={styles.card}>
    <h1>Support staff</h1>
    <AddStaffForm ... />
    <ul className={styles.staffList}>...</ul>
  </section>
</main>
```

```tsx
<main className={styles.page}>
  <section className={styles.card}>
    <h1>Support Admin Login</h1>
    <LoginForm />
  </section>
</main>
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/support-admin-staff-page.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add support-admin/src/views/staff/ui/staff-page.tsx support-admin/src/views/staff/ui/staff-page.module.css support-admin/src/features/staff/add/ui/add-staff-form.tsx support-admin/src/features/staff/add/ui/add-staff-form.module.css support-admin/src/views/login/ui/login-page.tsx support-admin/src/views/login/ui/login-page.module.css support-admin/src/features/auth/login/ui/login-form.tsx support-admin/src/features/auth/login/ui/login-form.module.css tests/support-admin-staff-page.test.tsx
git commit -m "Redesign support staff and login pages"
```

### Task 9: Regression, Docs, And Final Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-04-19-support-admin-redesign-and-withdraw-chat-design.md` (optional implementation notes section)
- Test: `tests/withdraw-support-routes.test.ts`
- Test: `tests/withdraw-ticket-chat.test.tsx`
- Test: `tests/support-admin-ticket-chat-page.test.tsx`
- Test: `tests/support-admin-staff-page.test.tsx`

**Step 1: Write the failing test**

```ts
// tests/withdraw-support-routes.test.ts
it('returns 401 for support endpoints without auth cookie', async () => {
  const response = await getWithdrawalTicket(
    new Request('http://localhost/v1/support/withdrawals/w_1/ticket'),
    { params: Promise.resolve({ withdrawalId: 'w_1' }) }
  );

  expect(response.status).toBe(401);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/withdraw-support-routes.test.ts`
Expected: FAIL until unauthorized branch is implemented for all user support routes.

**Step 3: Write minimal implementation**

```ts
if (!hasSessionRequest(request)) {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}
```

Add this guard to each new withdraw support route handler.

**Step 4: Run full verification**

Run: `npm run test`
Expected: PASS (all tests green).

Manual smoke check (two terminals):

```bash
npm run dev
npm run dev:support-admin
```

Scenario:
1. Create withdrawal on `http://localhost:3000/withdraw`.
2. Open `http://localhost:3000/withdraw/{id}` and send user message.
3. Open related ticket in admin `http://localhost:3001/tickets/{ticketId}`.
4. Verify bidirectional realtime updates without reload.

**Step 5: Commit**

```bash
git add README.md tests/withdraw-support-routes.test.ts tests/withdraw-ticket-chat.test.tsx tests/support-admin-ticket-chat-page.test.tsx tests/support-admin-staff-page.test.tsx
git commit -m "Verify support chat flow and document new routes"
```
