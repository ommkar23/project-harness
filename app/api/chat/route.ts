import { createChatResponse } from '../../../lib/chat-harness';
import { createErrorResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  try {
    return await createChatResponse(request);
  } catch (error) {
    return createErrorResponse(error, 'Unknown chat route failure.');
  }
}
