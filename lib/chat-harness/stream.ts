import { stepCountIs, streamText, tool } from 'ai';
import { z } from 'zod';

import { isEligibleModelId } from '../../src/harness-config';
import { resolveServerChatModel } from '../harness-config';
import { buildSandboxSummary, executePythonInSandbox } from '../sandbox-session';
import { buildContextModelMessages } from './context';
import type { ChatRequestBody } from './request';

const executePythonSchema = z.object({
  code: z
    .string()
    .min(1)
    .describe(
      'Inline Python to execute inside the sandbox repository root. Use Python for all file reads, edits, searches, and subprocess calls.',
    ),
});

export async function createChatStream(body: ChatRequestBody) {
  if (body.modelId != null && !isEligibleModelId(body.modelId)) {
    throw new Error(`Model ${body.modelId} is not in the harness allowlist.`);
  }

  const model = resolveServerChatModel(body.modelId);
  const contextMessages = await buildContextModelMessages(body.messages);

  return streamText({
    model: model.model,
    system: buildSandboxSummary(),
    messages: contextMessages,
    maxRetries: 2,
    stopWhen: stepCountIs(8),
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'project-harness-chat',
      metadata: { chatId: body.id, modelId: model.id },
    },
    ...(model.providerOptions != null ? { providerOptions: model.providerOptions } : {}),
    tools: {
      executePython: tool({
        description:
          'Execute inline Python in the sandbox repo root. Use this for file reads, edits, searches, subprocess calls, tests, and project commands.',
        inputSchema: executePythonSchema,
        execute: async ({ code }) => executePythonInSandbox({ chatId: body.id, code }),
      }),
    },
  });
}
