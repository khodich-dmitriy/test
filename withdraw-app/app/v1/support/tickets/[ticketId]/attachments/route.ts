import { handleUploadUserTicketAttachments } from '@/src/app/api/support/upload-user-ticket-attachments-handler';

interface Props {
  params: Promise<{ ticketId: string }>;
}

export async function POST(request: Request, context: Props) {
  const { ticketId } = await context.params;
  return handleUploadUserTicketAttachments(request, ticketId);
}
