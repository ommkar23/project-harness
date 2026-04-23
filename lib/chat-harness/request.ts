import type { UIMessage } from 'ai';

export type ChatRequestBody = {
  id: string;
  messages: UIMessage[];
  modelId?: string;
};

export function parseChatRequestBody(value: unknown): ChatRequestBody {
  if (typeof value !== 'object' || value == null) {
    throw new Error('Chat request body must be an object.');
  }

  const record = value as {
    id?: unknown;
    messages?: unknown;
    modelId?: unknown;
  };

  if (typeof record.id !== 'string' || record.id.length === 0) {
    throw new Error('Chat request must include a non-empty id.');
  }

  if (!Array.isArray(record.messages)) {
    throw new Error('Chat request must include a messages array.');
  }

  return {
    id: record.id,
    messages: record.messages as UIMessage[],
    ...(typeof record.modelId === 'string' && record.modelId.length > 0
      ? { modelId: record.modelId }
      : {}),
  };
}
