import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildContextModelMessages } from '../lib/chat-harness/context';

type Fixture = {
  expectedTexts: string[];
  messages: Parameters<typeof buildContextModelMessages>[0];
};

type TextContentPart = {
  text: string;
  type: 'text';
};

async function readFixture(name: string): Promise<Fixture> {
  const file = path.join(process.cwd(), 'test', 'fixtures', 'chat-context', `${name}.json`);
  const contents = await readFile(file, 'utf8');
  return JSON.parse(contents) as Fixture;
}

describe('chat context transformation', () => {
  it('retains assistant text and converts completed tool results into synthetic user context', async () => {
    const fixture = await readFixture('basic');
    const modelMessages = await buildContextModelMessages(fixture.messages);
    const textBodies = modelMessages.map((message) => {
      const content = message.content as Array<{ text?: string; type: string }>;
      const textParts = content.filter((part): part is TextContentPart => part.type === 'text');

      return textParts.map((part) => part.text).join('\n');
    });

    expect(textBodies).toEqual(fixture.expectedTexts);
  });
});
