import { createErrorResponse, readJsonRequest } from '../../../../lib/http';
import { parseResetRequestBody } from '../../../../lib/reset-request';
import { resetSandboxSession } from '../../../../lib/sandbox-session';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  try {
    const { chatId } = parseResetRequestBody(await readJsonRequest(request));
    const result = await resetSandboxSession(chatId);

    return Response.json(result);
  } catch (error) {
    return createErrorResponse(error, 'Unknown reset route failure.');
  }
}
