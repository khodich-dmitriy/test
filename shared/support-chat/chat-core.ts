import type { SupportMessage } from '../../src/entities/support/model/types';

export const SUPPORT_REACTION_OPTIONS = [
  { emoji: '👍', label: 'thumbs up' },
  { emoji: '❤️', label: 'heart' },
  { emoji: '🔥', label: 'fire' },
  { emoji: '👏', label: 'clap' },
  { emoji: '🎉', label: 'party' },
  { emoji: '😮', label: 'wow' }
] as const;

export interface ChatMessagePayload {
  text: string;
  attachment_ids?: string[];
  reply_to_message_id?: string;
}

export function mergeSupportMessages(
  existing: SupportMessage[],
  incoming: SupportMessage[]
): SupportMessage[] {
  const messageMap = new Map<string, { message: SupportMessage; order: number }>();
  let order = 0;

  for (const message of existing) {
    messageMap.set(message.id, { message, order });
    order += 1;
  }

  for (const message of incoming) {
    const current = messageMap.get(message.id);
    messageMap.set(message.id, {
      message: current ? { ...current.message, ...message } : message,
      order: current?.order ?? order
    });

    if (!current) {
      order += 1;
    }
  }

  return [...messageMap.values()]
    .sort((left, right) => {
      const timeDiff = Date.parse(left.message.created_at) - Date.parse(right.message.created_at);
      if (timeDiff !== 0) {
        return timeDiff;
      }

      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.message.id.localeCompare(right.message.id);
    })
    .map(({ message }) => message);
}

export function withReaction(
  messages: SupportMessage[],
  reaction: NonNullable<SupportMessage['reaction']>
): SupportMessage[] {
  return messages.map((message) =>
    message.id === reaction.message_id ? { ...message, reaction } : message
  );
}

export function buildChatMessagePayload(
  text: string,
  attachmentIds: string[],
  replyToMessageId?: string | null
): ChatMessagePayload {
  return {
    text,
    ...(attachmentIds.length > 0 ? { attachment_ids: attachmentIds } : {}),
    ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {})
  };
}

export function appendFilesToChatFormData(
  files: File[],
  transcripts: Record<string, string>
): FormData {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
    if (transcripts[file.name]) {
      formData.append(`transcript:${file.name}`, transcripts[file.name]);
    }
  }
  return formData;
}

export function playChatNotificationSound(windowObject: Window): void {
  try {
    const audioWindow = windowObject as Window & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) {
      return;
    }

    const audioContext = new AudioContextConstructor();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = 720;
    gain.gain.value = 0.04;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.12);
  } catch {
    // Browsers can block notification audio until after a user gesture.
  }
}
