import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from 'ai';
import { z } from 'zod';

import { getDefaultChatModel } from '../src/models';
import { buildSandboxSummary, executePythonInSandbox } from './sandbox-session';

const executePythonSchema = z.object({
  code: z
    .string()
    .min(1)
    .describe(
      'Inline Python to execute inside the sandbox repository root. Use Python for all file reads, edits, searches, and subprocess calls.',
    ),
});

type ChatRequestBody = {
  id: string;
  messages: UIMessage[];
};

type ContextModelMessages = Awaited<ReturnType<typeof convertToModelMessages>>;
type UIMessagePart = UIMessage['parts'][number];

function isToolPart(part: UIMessagePart): boolean {
  return part.type === 'dynamic-tool' || part.type.startsWith('tool-');
}

function isCompletedToolPart(part: UIMessagePart): boolean {
  if (!isToolPart(part) || !('state' in part)) {
    return false;
  }

  return (
    part.state === 'output-available' ||
    part.state === 'output-error' ||
    part.state === 'output-denied'
  );
}

function hasRetainedNonToolParts(message: UIMessage): boolean {
  return message.parts.some((part) => part.type !== 'step-start' && !isToolPart(part));
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function formatSandboxOutput(part: UIMessagePart): string {
  if (!isToolPart(part) || !('state' in part)) {
    return '';
  }

  if (part.state === 'output-denied') {
    return ['[executePython output]', 'Execution denied.'].join('\n');
  }

  if (part.state === 'output-error') {
    return ['[executePython output]', part.errorText ?? 'Execution failed.'].join('\n');
  }

  const output = 'output' in part ? part.output : undefined;

  if (
    output != null &&
    typeof output === 'object' &&
    'exitCode' in output &&
    'stdout' in output &&
    'stderr' in output &&
    'durationMs' in output &&
    'truncated' in output
  ) {
    const execution = output as {
      durationMs: number;
      exitCode: number;
      stderr: string;
      stdout: string;
      truncated: boolean;
    };

    return [
      '[executePython output]',
      `exitCode: ${String(execution.exitCode)}`,
      `durationMs: ${String(execution.durationMs)}`,
      `truncated: ${String(execution.truncated)}`,
      '',
      'stdout:',
      execution.stdout.length > 0 ? execution.stdout : '[empty]',
      '',
      'stderr:',
      execution.stderr.length > 0 ? execution.stderr : '[empty]',
    ].join('\n');
  }

  return ['[executePython output]', stringifyValue(output)].join('\n');
}

async function buildContextModelMessages(messages: UIMessage[]): Promise<ContextModelMessages> {
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
            text: formatSandboxOutput(part),
          },
        ],
      });
    }
  }

  return convertToModelMessages(sanitizedMessages);
}

function parseChatRequestBody(value: unknown): ChatRequestBody {
  if (typeof value !== 'object' || value == null) {
    throw new Error('Chat request body must be an object.');
  }

  const record = value as {
    id?: unknown;
    messages?: unknown;
  };
  const { id, messages } = record;

  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Chat request must include a non-empty id.');
  }

  if (!Array.isArray(messages)) {
    throw new Error('Chat request must include a messages array.');
  }

  return {
    id,
    messages: messages as UIMessage[],
  };
}

export async function createChatResponse(request: Request): Promise<Response> {
  const body = parseChatRequestBody(await request.json());
  const model = getDefaultChatModel();
  const contextMessages = await buildContextModelMessages(body.messages);

  const result = streamText({
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
    tools: {
      executePython: tool({
        description:
          'Execute inline Python in the sandbox repo root. Use this for file reads, edits, searches, subprocess calls, tests, and project commands.',
        inputSchema: executePythonSchema,
        execute: async ({ code }) => executePythonInSandbox({ chatId: body.id, code }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
