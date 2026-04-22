import { resetSandboxSession } from '../../../../lib/sandbox-session';

export const runtime = 'nodejs';
export const maxDuration = 60;

function parseResetRequestBody(value: unknown): { chatId: string } {
  if (typeof value !== 'object' || value == null) {
    throw new Error('Reset request body must be an object.');
  }

  const record = value as { chatId?: unknown };

  if (typeof record.chatId !== 'string' || record.chatId.length === 0) {
    throw new Error('Reset request must include a non-empty chatId.');
  }

  return { chatId: record.chatId };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const requestBody: unknown = await request.json();
    const { chatId } = parseResetRequestBody(requestBody);
    const result = await resetSandboxSession(chatId);

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown reset route failure.';

    return new Response(message, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
}
