import type { Sandbox, CommandFinished } from '@vercel/sandbox';

import { PYTHON_COMMAND, REPO_PATH } from './constants';

type RunCommandCheckedParams = {
  sandbox: Sandbox;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  signal?: AbortSignal;
  label: string;
};

async function pathExists(sandbox: Sandbox, path: string): Promise<boolean> {
  try {
    await sandbox.fs.stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function runCommandChecked({
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

export async function bootstrapSandbox(
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
