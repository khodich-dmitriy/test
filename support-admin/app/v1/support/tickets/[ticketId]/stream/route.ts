import { handleStreamTicketMessages } from '../../../../../../../src/app/api/support/stream-ticket-messages-handler';
import { getSessionFromRequest } from '../../../../../../src/entities/session/model/auth';

interface Props {
  params: Promise<{ ticketId: string }>;
}

export async function GET(request: Request, context: Props) {
  const { ticketId } = await context.params;
  return handleStreamTicketMessages(request, ticketId, {
    authMode: 'support-session',
    hasSupportAccess: (incomingRequest) => getSessionFromRequest(incomingRequest) !== null
  });
}
