export function collectMessageDelta<T extends { id: string }>(
  messages: readonly T[],
  lastSeenId?: string | null
): T[] {
  if (!lastSeenId) {
    return [...messages];
  }

  const lastSeenIndex = messages.findIndex((message) => message.id === lastSeenId);
  if (lastSeenIndex === -1) {
    return [...messages];
  }

  return messages.slice(lastSeenIndex + 1);
}
