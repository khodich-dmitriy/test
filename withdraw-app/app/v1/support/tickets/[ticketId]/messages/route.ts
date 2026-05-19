import { handlePostUserTicketMessage } from '@/src/app/api/support/post-user-ticket-message-handler';

interface Props {
  params: Promise<{ ticketId: string }>;
}

export async function POST(request: Request, context: Props) {
  const { ticketId } = await context.params;
  return handlePostUserTicketMessage(request, ticketId);
}
