import { handleGetUserAttachment } from '@/src/app/api/support/get-user-attachment-handler';

interface Props {
  params: Promise<{ attachmentId: string }>;
}

export async function GET(request: Request, context: Props) {
  const { attachmentId } = await context.params;
  return handleGetUserAttachment(request, attachmentId);
}
