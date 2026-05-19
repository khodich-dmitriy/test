import { redirect } from 'next/navigation';

import { getServerSupportSession } from '../../../src/entities/session/model/server-session';
import {
  getSupportUserById,
  getTicketById,
  listMessagesByTicketId
} from '../../../src/entities/support/model/support-store';
import { TicketChatPage } from '../../../src/views/ticket-chat/ui/ticket-chat-page';

interface Props {
  params: Promise<{ ticketId: string }>;
}

export default async function TicketRoutePage({ params }: Props) {
  const session = await getServerSupportSession();
  if (!session) {
    redirect('/login');
  }

  const { ticketId } = await params;
  const ticket = getTicketById(ticketId);
  const user = getSupportUserById(ticket.user_id);
  const messages = listMessagesByTicketId(ticketId);

  return <TicketChatPage ticketId={ticketId} initialPayload={{ ticket, user, messages }} />;
}
