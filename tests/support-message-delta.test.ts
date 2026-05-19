import { describe, expect, it } from 'vitest';

import { collectMessageDelta } from '@/src/entities/support/model/message-delta';

interface TestMessage {
  id: string;
  text: string;
  created_at: string;
}

describe('collectMessageDelta', () => {
  const messages: TestMessage[] = [
    { id: 'm_1', text: 'First', created_at: '2026-01-01T10:00:00.000Z' },
    { id: 'm_2', text: 'Second', created_at: '2026-01-01T10:01:00.000Z' },
    { id: 'm_3', text: 'Third', created_at: '2026-01-01T10:02:00.000Z' }
  ];

  it('returns all messages when lastSeenId is missing', () => {
    expect(collectMessageDelta(messages)).toEqual(messages);
  });

  it('returns only newer messages when lastSeenId is known', () => {
    expect(collectMessageDelta(messages, 'm_1')).toEqual(messages.slice(1));
    expect(collectMessageDelta(messages, 'm_2')).toEqual(messages.slice(2));
  });

  it('returns all messages when lastSeenId is unknown', () => {
    expect(collectMessageDelta(messages, 'missing')).toEqual(messages);
  });
});
