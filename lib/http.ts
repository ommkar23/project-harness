export async function readJsonRequest(request: Request): Promise<unknown> {
  return request.json();
}

export function createErrorResponse(
  error: unknown,
  fallbackMessage: string,
  status = 500,
): Response {
  const message = error instanceof Error ? error.message : fallbackMessage;

  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
