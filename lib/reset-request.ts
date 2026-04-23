export type ResetRequestBody = {
  chatId: string;
};

export function parseResetRequestBody(value: unknown): ResetRequestBody {
  if (typeof value !== 'object' || value == null) {
    throw new Error('Reset request body must be an object.');
  }

  const record = value as { chatId?: unknown };

  if (typeof record.chatId !== 'string' || record.chatId.length === 0) {
    throw new Error('Reset request must include a non-empty chatId.');
  }

  return { chatId: record.chatId };
}
