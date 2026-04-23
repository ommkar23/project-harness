import { convertToModelMessages, type UIMessage } from 'ai';

import {
  formatExecutePythonContextOutput,
  isCompletedToolPart,
  isToolPart,
} from '../execute-python';

export type ContextModelMessages = Awaited<ReturnType<typeof convertToModelMessages>>;

function hasRetainedNonToolParts(message: UIMessage): boolean {
  return message.parts.some((part) => part.type !== 'step-start' && !isToolPart(part));
}

export async function buildContextModelMessages(messages: UIMessage[]): Promise<ContextModelMessages> {
  const sanitizedMessages: UIMessage[] = [];

  for (const message of messages) {
    const retainedParts = message.parts.filter((part) => !isToolPart(part));

    if (hasRetainedNonToolParts({ ...message, parts: retainedParts })) {
      sanitizedMessages.push({
        ...message,
        parts: retainedParts,
      });
    }

    for (const part of message.parts) {
      if (!isCompletedToolPart(part)) {
        continue;
      }

      sanitizedMessages.push({
        id: `${message.id}-${'toolCallId' in part ? part.toolCallId : 'tool-output'}`,
        role: 'user',
        parts: [
          {
            type: 'text',
            text: formatExecutePythonContextOutput(part),
          },
        ],
      });
    }
  }

  return convertToModelMessages(sanitizedMessages);
}
