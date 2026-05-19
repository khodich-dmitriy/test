import { handleStreamTicketMessages } from '@/src/app/api/support/stream-ticket-messages-handler';

interface Props {
  params: Promise<{ ticketId: string }>;
}

export async function GET(request: Request, context: Props) {
  const { ticketId } = await context.params;
  return handleStreamTicketMessages(request, ticketId, { authMode: 'access-cookie' });
}
