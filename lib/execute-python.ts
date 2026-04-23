import type { UIMessage } from 'ai';

export type PythonExecutionOutput = {
  durationMs: number;
  exitCode: number;
  stderr: string;
  stdout: string;
  truncated: boolean;
};

export type ExecutePythonToolPart = Extract<UIMessage['parts'][number], { type: `tool-${string}` }> & {
  type: 'tool-executePython';
};

type UIMessagePart = UIMessage['parts'][number];

export function isToolPart(part: UIMessagePart): boolean {
  return part.type === 'dynamic-tool' || part.type.startsWith('tool-');
}

export function isExecutePythonToolPart(part: UIMessagePart): part is ExecutePythonToolPart {
  return part.type === 'tool-executePython';
}

export function isCompletedToolPart(part: UIMessagePart): boolean {
  if (!isToolPart(part) || !('state' in part)) {
    return false;
  }

  return (
    part.state === 'output-available' ||
    part.state === 'output-error' ||
    part.state === 'output-denied'
  );
}

export function stringifyToolValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  const json = JSON.stringify(value, null, 2);
  return json ?? String(value);
}

export function extractExecutePythonCode(input: unknown): string {
  if (typeof input === 'object' && input != null && 'code' in input) {
    const value = (input as { code?: unknown }).code;

    if (typeof value === 'string') {
      return value;
    }
  }

  return stringifyToolValue(input);
}

export function isPythonExecutionOutput(value: unknown): value is PythonExecutionOutput {
  return (
    typeof value === 'object' &&
    value != null &&
    'exitCode' in value &&
    'stdout' in value &&
    'stderr' in value &&
    'durationMs' in value &&
    'truncated' in value
  );
}

export function formatExecutePythonDisplayOutput(output: unknown): string {
  if (isPythonExecutionOutput(output)) {
    const sections = [output.stdout, output.stderr]
      .map((value) => value.trimEnd())
      .filter((value) => value.length > 0);

    return sections.length > 0 ? sections.join('\n') : '[empty]';
  }

  return stringifyToolValue(output);
}

export function formatExecutePythonContextOutput(part: UIMessagePart): string {
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

  if (isPythonExecutionOutput(output)) {
    return [
      '[executePython output]',
      `exitCode: ${String(output.exitCode)}`,
      `durationMs: ${String(output.durationMs)}`,
      `truncated: ${String(output.truncated)}`,
      '',
      'stdout:',
      output.stdout.length > 0 ? output.stdout : '[empty]',
      '',
      'stderr:',
      output.stderr.length > 0 ? output.stderr : '[empty]',
    ].join('\n');
  }

  return ['[executePython output]', stringifyToolValue(output)].join('\n');
}
