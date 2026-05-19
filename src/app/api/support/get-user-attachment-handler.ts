import { NextResponse } from 'next/server';

import { getDefaultSystemUserId } from '../../../../shared/mock/system-db';
import { isAuthenticatedRequest } from '../../../entities/session/model/auth';
import {
  ensureAttachmentReadableByUser,
  readAttachmentBytes,
  SupportAccessError,
  SupportNotFoundError
} from '../../../entities/support/model/chat-store';
import { unauthorizedResponse } from '../withdrawals/response';

export async function handleGetUserAttachment(request: Request, attachmentId: string) {
  if (!isAuthenticatedRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { attachment } = ensureAttachmentReadableByUser(attachmentId, getDefaultSystemUserId());
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

    if (error instanceof SupportAccessError) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
