import { createChatResponse } from '../../../lib/chat-harness';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  try {
    return await createChatResponse(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown chat route failure.';

    return new Response(message, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
}
