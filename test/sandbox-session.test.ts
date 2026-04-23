import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetHarnessEnvironmentCacheForTests } from '../lib/harness-config';
import {
  createSandboxSession,
  getOrCreateSandboxSession,
  resetSandboxSession,
} from '../lib/sandbox/lifecycle';
import { resetSandboxSessionStoreForTests } from '../lib/sandbox/store';

const {
  bootstrapSandboxMock,
  createSandboxMock,
  getSandboxMock,
} = vi.hoisted(() => ({
  bootstrapSandboxMock: vi.fn(),
  createSandboxMock: vi.fn(),
  getSandboxMock: vi.fn(),
}));

vi.mock('../lib/sandbox/client', () => ({
  createSandbox: createSandboxMock,
  getSandbox: getSandboxMock,
}));

vi.mock('../lib/sandbox/bootstrap', () => ({
  bootstrapSandbox: bootstrapSandboxMock,
}));

function makeSandbox(id: string) {
  return {
    sandboxId: id,
    stop: vi.fn().mockResolvedValue(undefined),
  };
}

type SandboxCreateCall = {
  env: Record<string, string>;
};

beforeEach(() => {
  resetHarnessEnvironmentCacheForTests();
  resetSandboxSessionStoreForTests();
  createSandboxMock.mockReset();
  getSandboxMock.mockReset();
  bootstrapSandboxMock.mockReset();
  vi.stubEnv('AI_GATEWAY_API_KEY', 'test');
  vi.stubEnv('EXA_API_KEY', 'exa-key');
  vi.stubEnv('TAVILY_API_KEY', 'tavily-key');
  vi.stubEnv('FIRECRAWL_API_KEY', 'firecrawl-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sandbox session lifecycle', () => {
  it('creates a sandbox and forwards repo helper env vars', async () => {
    const sandbox = makeSandbox('sandbox-1');
    createSandboxMock.mockResolvedValue(sandbox);

    const session = await createSandboxSession('chat-1');
    const createCall = createSandboxMock.mock.calls[0];

    expect(session.record.sandboxId).toBe('sandbox-1');
    expect(createCall).toBeDefined();
    if (createCall == null) {
      throw new Error('Sandbox.create was not called.');
    }
    const [createParams] = createCall as [SandboxCreateCall];
    expect(createParams).toMatchObject({
      env: {
        EXA_API_KEY: 'exa-key',
        FIRECRAWL_API_KEY: 'firecrawl-key',
        PYTHONDONTWRITEBYTECODE: '1',
        PYTHONUNBUFFERED: '1',
        TAVILY_API_KEY: 'tavily-key',
      },
    });
    expect(bootstrapSandboxMock).toHaveBeenCalledWith(sandbox, undefined);
  });

  it('reuses an existing sandbox before creating a new one', async () => {
    const sandbox = makeSandbox('sandbox-2');
    createSandboxMock.mockResolvedValue(sandbox);
    getSandboxMock.mockResolvedValue(sandbox);

    const first = await getOrCreateSandboxSession('chat-2');
    const second = await getOrCreateSandboxSession('chat-2');

    expect(first.record.sandboxId).toBe('sandbox-2');
    expect(second.record.sandboxId).toBe('sandbox-2');
    expect(createSandboxMock).toHaveBeenCalledTimes(1);
    expect(getSandboxMock).toHaveBeenCalledTimes(1);
  });

  it('resets an active sandbox session and stops the sandbox', async () => {
    const sandbox = makeSandbox('sandbox-3');
    createSandboxMock.mockResolvedValue(sandbox);
    getSandboxMock.mockResolvedValue(sandbox);

    await createSandboxSession('chat-3');
    const result = await resetSandboxSession('chat-3');

    expect(result).toEqual({ reset: true, sandboxId: 'sandbox-3' });
    expect(sandbox.stop).toHaveBeenCalledWith({ blocking: true });
  });
});
