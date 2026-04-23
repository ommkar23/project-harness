import { randomUUID } from 'node:crypto';

import { getHarnessEnvironment } from '../harness-config';
import { getOrCreateSandboxSession } from './lifecycle';
import {
  PYTHON_COMMAND,
  PYTHON_EXECUTION_BOOTSTRAP,
  REPO_PATH,
} from './constants';
import { getSandboxSessionStore } from './store';

export type PythonExecutionResult = {
  sandboxId: string;
  scriptPath: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  truncated: boolean;
};

function truncateOutput(output: string, limit: number): { text: string; truncated: boolean } {
  if (output.length <= limit) {
    return { text: output, truncated: false };
  }

  return {
    text: `${output.slice(0, limit)}\n...[truncated ${output.length - limit} chars]`,
    truncated: true,
  };
}

export async function executePythonInSandbox(params: {
  chatId: string;
  code: string;
}): Promise<PythonExecutionResult> {
  const runtimeConfig = getHarnessEnvironment();
  const { sandbox, record } = await getOrCreateSandboxSession(params.chatId);
  const scriptDirectory = `${REPO_PATH}/.harness`;
  const scriptPath = `${scriptDirectory}/exec-${randomUUID()}.py`;
  const scriptContents = `${PYTHON_EXECUTION_BOOTSTRAP}${params.code}`;

  await sandbox.fs.mkdir(scriptDirectory, { recursive: true });
  await sandbox.fs.writeFile(scriptPath, scriptContents, 'utf8');

  const startTime = Date.now();
  const result = await sandbox.runCommand({
    cmd: PYTHON_COMMAND,
    args: [scriptPath],
    cwd: REPO_PATH,
    env: {
      PYTHONPATH: REPO_PATH,
    },
    signal: AbortSignal.timeout(runtimeConfig.HARNESS_EXECUTION_TIMEOUT_MS),
  });
  const durationMs = Date.now() - startTime;

  const [stdout, stderr] = await Promise.all([result.stdout(), result.stderr()]);
  const truncatedStdout = truncateOutput(stdout, runtimeConfig.HARNESS_EXECUTION_OUTPUT_LIMIT);
  const truncatedStderr = truncateOutput(stderr, runtimeConfig.HARNESS_EXECUTION_OUTPUT_LIMIT);

  getSandboxSessionStore().set(params.chatId, {
    ...record,
    lastUsedAt: new Date().toISOString(),
  });

  return {
    sandboxId: sandbox.sandboxId,
    scriptPath,
    exitCode: result.exitCode,
    stdout: truncatedStdout.text,
    stderr: truncatedStderr.text,
    durationMs,
    truncated: truncatedStdout.truncated || truncatedStderr.truncated,
  };
}
