import { NextResponse } from 'next/server';

import { getSessionFromRequest } from '../../../../../src/entities/session/model/auth';
import {
  getAttachmentById,
  readAttachmentBytes,
  SupportNotFoundError
} from '../../../../../src/entities/support/model/support-store';

interface Props {
  params: Promise<{ attachmentId: string }>;
}

export async function GET(request: Request, context: Props) {
  if (!getSessionFromRequest(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { attachmentId } = await context.params;
    const attachment = getAttachmentById(attachmentId);
    const bytes = readAttachmentBytes(attachment.storage_key);

    return new Response(bytes, {
      headers: {
        'content-type': attachment.content_type,
        'content-length': String(attachment.size),
        'content-disposition': `inline; filename="${attachment.name.replaceAll('"', '')}"`
      }
    });
  } catch (error) {
    if (error instanceof SupportNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
