import { handlePostUserMessageReaction } from '@/src/app/api/support/post-user-message-reaction-handler';

interface Props {
  params: Promise<{ messageId: string }>;
}

export async function POST(request: Request, context: Props) {
  const { messageId } = await context.params;
  return handlePostUserMessageReaction(request, messageId);
}
