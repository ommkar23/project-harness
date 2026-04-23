import { readJsonRequest } from './http';
import { parseChatRequestBody } from './chat-harness/request';
import { createChatStream } from './chat-harness/stream';

export async function createChatResponse(request: Request): Promise<Response> {
  const body = parseChatRequestBody(await readJsonRequest(request));
  const result = await createChatStream(body);
  return result.toUIMessageStreamResponse();
}
