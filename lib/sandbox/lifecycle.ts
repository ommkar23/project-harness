import type { Sandbox } from '@vercel/sandbox';

import { getHarnessEnvironment } from '../harness-config';
import { bootstrapSandbox } from './bootstrap';
import { createSandbox, getSandbox } from './client';
import { getSandboxSessionStore, type SandboxSessionRecord } from './store';

function buildSandboxEnv(runtimeConfig: ReturnType<typeof getHarnessEnvironment>): Record<string, string> {
  return {
    PYTHONDONTWRITEBYTECODE: '1',
    PYTHONUNBUFFERED: '1',
    ...(runtimeConfig.EXA_API_KEY != null ? { EXA_API_KEY: runtimeConfig.EXA_API_KEY } : {}),
    ...(runtimeConfig.TAVILY_API_KEY != null ? { TAVILY_API_KEY: runtimeConfig.TAVILY_API_KEY } : {}),
    ...(runtimeConfig.FIRECRAWL_API_KEY != null
      ? { FIRECRAWL_API_KEY: runtimeConfig.FIRECRAWL_API_KEY }
      : {}),
  };
}

export async function createSandboxSession(chatId: string): Promise<{
  sandbox: Sandbox;
  record: SandboxSessionRecord;
}> {
  const runtimeConfig = getHarnessEnvironment();
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

  const sandbox = await createSandbox({
    runtime: 'python3.13',
    timeout: runtimeConfig.HARNESS_SANDBOX_TIMEOUT_MS,
    source,
    env: buildSandboxEnv(runtimeConfig),
  });

  await bootstrapSandbox(sandbox, runtimeConfig.HARNESS_REPO_GIT_PASSWORD);

  const now = new Date().toISOString();
  const record: SandboxSessionRecord = {
    chatId,
    sandboxId: sandbox.sandboxId,
    createdAt: now,
    lastUsedAt: now,
  };

  getSandboxSessionStore().set(chatId, record);
  return { sandbox, record };
}

export async function getOrCreateSandboxSession(chatId: string): Promise<{
  sandbox: Sandbox;
  record: SandboxSessionRecord;
}> {
  const store = getSandboxSessionStore();
  const existing = store.get(chatId);

  if (existing != null) {
    try {
      const sandbox = await getSandbox(existing.sandboxId);
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

export async function resetSandboxSession(chatId: string): Promise<{
  reset: boolean;
  sandboxId?: string;
}> {
  const store = getSandboxSessionStore();
  const existing = store.get(chatId);

  if (existing == null) {
    return { reset: false };
  }

  store.delete(chatId);

  try {
    const sandbox = await getSandbox(existing.sandboxId);
    await sandbox.stop({ blocking: true });
  } catch {
    // Resetting the local store is sufficient when the sandbox no longer exists.
  }

  return {
    reset: true,
    sandboxId: existing.sandboxId,
  };
}
