import { randomUUID } from 'node:crypto';

import { Sandbox, type CommandFinished } from '@vercel/sandbox';

import { getRuntimeConfig } from './runtime-config';

const REPO_PATH = '/vercel/sandbox';
const PYTHON_COMMAND = 'python3';

type SandboxSessionRecord = {
  chatId: string;
  sandboxId: string;
  createdAt: string;
  lastUsedAt: string;
};

type SandboxSessionStore = Map<string, SandboxSessionRecord>;

export type PythonExecutionResult = {
  sandboxId: string;
  scriptPath: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  truncated: boolean;
};

type RunCommandCheckedParams = {
  sandbox: Sandbox;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  signal?: AbortSignal;
  label: string;
};

declare global {
  var __projectHarnessSandboxSessions__: SandboxSessionStore | undefined;
}

function getSessionStore(): SandboxSessionStore {
  globalThis.__projectHarnessSandboxSessions__ ??= new Map<string, SandboxSessionRecord>();
  return globalThis.__projectHarnessSandboxSessions__;
}

function truncateOutput(output: string, limit: number): { text: string; truncated: boolean } {
  if (output.length <= limit) {
    return { text: output, truncated: false };
  }

  return {
    text: `${output.slice(0, limit)}\n...[truncated ${output.length - limit} chars]`,
    truncated: true,
  };
}

async function pathExists(sandbox: Sandbox, path: string): Promise<boolean> {
  try {
    await sandbox.fs.stat(path);
    return true;
  } catch {
    return false;
  }
}

async function runCommandChecked({
  sandbox,
  command,
  args,
  cwd,
  env,
  signal,
  label,
}: RunCommandCheckedParams): Promise<CommandFinished> {
  const params: {
    cmd: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    signal?: AbortSignal;
  } = {
    cmd: command,
  };

  if (args != null) {
    params.args = args;
  }

  if (cwd != null) {
    params.cwd = cwd;
  }

  if (env != null) {
    params.env = env;
  }

  if (signal != null) {
    params.signal = signal;
  }

  const result = await sandbox.runCommand(params);

  if (result.exitCode === 0) {
    return result;
  }

  const [stdout, stderr] = await Promise.all([result.stdout(), result.stderr()]);

  throw new Error(
    [
      `${label} failed with exit code ${result.exitCode}.`,
      stdout.length > 0 ? `stdout:\n${stdout}` : null,
      stderr.length > 0 ? `stderr:\n${stderr}` : null,
    ]
      .filter((value): value is string => value != null)
      .join('\n\n'),
  );
}

async function bootstrapSandbox(
  sandbox: Sandbox,
  gitPassword: string | undefined,
): Promise<void> {
  if (gitPassword != null) {
    await runCommandChecked({
      sandbox,
      command: 'bash',
      args: [
        '-c',
        `printf 'machine github.com login x-access-token password %s\n' '${gitPassword}' > ~/.netrc && chmod 600 ~/.netrc`,
      ],
      label: 'git credential setup',
    });
  }

  await runCommandChecked({
    sandbox,
    command: PYTHON_COMMAND,
    args: ['-m', 'pip', 'install', '--upgrade', 'pip'],
    cwd: REPO_PATH,
    label: 'pip upgrade',
  });

  if (await pathExists(sandbox, `${REPO_PATH}/requirements.txt`)) {
    await runCommandChecked({
      sandbox,
      command: PYTHON_COMMAND,
      args: ['-m', 'pip', 'install', '-r', 'requirements.txt'],
      cwd: REPO_PATH,
      label: 'requirements installation',
    });
  }
}

async function createSandboxSession(chatId: string): Promise<{
  sandbox: Sandbox;
  record: SandboxSessionRecord;
}> {
  const runtimeConfig = getRuntimeConfig();
  const source =
    runtimeConfig.HARNESS_REPO_GIT_PASSWORD != null
      ? {
          type: 'git' as const,
          url: runtimeConfig.HARNESS_REPO_URL,
          revision: runtimeConfig.HARNESS_REPO_REVISION,
          depth: 1,
          username: 'x-access-token',
          password: runtimeConfig.HARNESS_REPO_GIT_PASSWORD,
        }
      : {
          type: 'git' as const,
          url: runtimeConfig.HARNESS_REPO_URL,
          revision: runtimeConfig.HARNESS_REPO_REVISION,
          depth: 1,
        };

  const sandbox = await Sandbox.create({
    runtime: 'python3.13',
    timeout: runtimeConfig.HARNESS_SANDBOX_TIMEOUT_MS,
    source,
    env: {
      PYTHONDONTWRITEBYTECODE: '1',
      PYTHONUNBUFFERED: '1',
    },
  });

  await bootstrapSandbox(sandbox, runtimeConfig.HARNESS_REPO_GIT_PASSWORD);

  const now = new Date().toISOString();
  const record: SandboxSessionRecord = {
    chatId,
    sandboxId: sandbox.sandboxId,
    createdAt: now,
    lastUsedAt: now,
  };

  getSessionStore().set(chatId, record);

  return { sandbox, record };
}

export async function getOrCreateSandboxSession(chatId: string): Promise<{
  sandbox: Sandbox;
  record: SandboxSessionRecord;
}> {
  const store = getSessionStore();
  const existing = store.get(chatId);

  if (existing != null) {
    try {
      const sandbox = await Sandbox.get({ sandboxId: existing.sandboxId });
      const updatedRecord: SandboxSessionRecord = {
        ...existing,
        lastUsedAt: new Date().toISOString(),
      };

      store.set(chatId, updatedRecord);
      return { sandbox, record: updatedRecord };
    } catch {
      store.delete(chatId);
    }
  }

  return createSandboxSession(chatId);
}

export function buildSandboxSummary(): string {
  const runtimeConfig = getRuntimeConfig();

  const lines = [
    `Repository URL: ${runtimeConfig.HARNESS_REPO_URL}`,
    `Repository revision: ${runtimeConfig.HARNESS_REPO_REVISION}`,
    `Sandbox workspace: ${REPO_PATH}`,
    'executePython runs your code inside the prepared sandbox environment.',
    'You may use Python stdlib, installed packages, and subprocess as needed.',
    'Prefer native Python APIs over shell commands when practical.',
  ];

  if (runtimeConfig.HARNESS_REPO_GIT_PASSWORD != null) {
    lines.push(
      'Git is pre-authenticated for the repository host. You may use git push, pull, and other remote operations directly without supplying credentials.',
    );
  }

  return lines.join('\n');
}

export async function executePythonInSandbox(params: {
  chatId: string;
  code: string;
}): Promise<PythonExecutionResult> {
  const runtimeConfig = getRuntimeConfig();
  const { sandbox, record } = await getOrCreateSandboxSession(params.chatId);
  const scriptDirectory = `${REPO_PATH}/.harness`;
  const scriptPath = `${scriptDirectory}/exec-${randomUUID()}.py`;

  await sandbox.fs.mkdir(scriptDirectory, { recursive: true });
  await sandbox.fs.writeFile(scriptPath, params.code, 'utf8');

  const startTime = Date.now();
  const result = await sandbox.runCommand({
    cmd: PYTHON_COMMAND,
    args: [scriptPath],
    cwd: REPO_PATH,
    signal: AbortSignal.timeout(runtimeConfig.HARNESS_EXECUTION_TIMEOUT_MS),
  });
  const durationMs = Date.now() - startTime;

  const [stdout, stderr] = await Promise.all([result.stdout(), result.stderr()]);
  const truncatedStdout = truncateOutput(stdout, runtimeConfig.HARNESS_EXECUTION_OUTPUT_LIMIT);
  const truncatedStderr = truncateOutput(stderr, runtimeConfig.HARNESS_EXECUTION_OUTPUT_LIMIT);

  getSessionStore().set(params.chatId, {
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
