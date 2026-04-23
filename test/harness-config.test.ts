import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDefaultModelId, resetHarnessEnvironmentCacheForTests } from '../lib/harness-config';
import {
  parseHarnessEnvironment,
  requireAiGatewayApiKey,
  resolveHarnessModel,
} from '../src/harness-config';

afterEach(() => {
  vi.unstubAllEnvs();
  resetHarnessEnvironmentCacheForTests();
});

describe('harness config', () => {
  it('parses runtime config defaults and trims optional secrets', () => {
    const environment = parseHarnessEnvironment({
      AI_GATEWAY_API_KEY: ' key ',
      EXA_API_KEY: '   ',
    });

    expect(environment.HARNESS_REPO_URL).toBe('https://github.com/ommkar23/harness-playground.git');
    expect(environment.HARNESS_REPO_REVISION).toBe('tools');
    expect(environment.EXA_API_KEY).toBeUndefined();
    expect(environment.AI_GATEWAY_API_KEY).toBe('key');
  });

  it('falls back through requested, chat, default, and built-in model ids', () => {
    const configured = parseHarnessEnvironment({
      AI_GATEWAY_API_KEY: 'test',
      HARNESS_CHAT_MODEL_ID: 'openai/gpt-5.4-mini',
    });

    expect(resolveHarnessModel(configured, 'openai/gpt-5.4-mini').resolvedModelId).toBe(
      'openai/gpt-5.4-mini',
    );
    expect(resolveHarnessModel(configured).resolvedModelId).toBe('openai/gpt-5.4-mini');
    expect(
      resolveHarnessModel(
        parseHarnessEnvironment({
          AI_GATEWAY_API_KEY: 'test',
          HARNESS_MODEL_ID: 'openai/gpt-5.4-mini',
        }),
      ).resolvedModelId,
    ).toBe('openai/gpt-5.4-mini');
    expect(
      resolveHarnessModel(
        parseHarnessEnvironment({
          AI_GATEWAY_API_KEY: 'test',
          HARNESS_MODEL_ID: 'not-allowed',
        }),
      ).resolvedModelId,
    ).toBe('openai/gpt-5.4-mini');
  });

  it('reads the cached default model from process env', () => {
    vi.stubEnv('AI_GATEWAY_API_KEY', 'test');
    vi.stubEnv('HARNESS_MODEL_ID', 'openai/gpt-5.4-mini');

    expect(getDefaultModelId()).toBe('openai/gpt-5.4-mini');
  });

  it('requires an AI gateway key for server model creation', () => {
    expect(() =>
      requireAiGatewayApiKey(
        parseHarnessEnvironment({
          AI_GATEWAY_API_KEY: undefined,
        }),
      ),
    ).toThrow(/AI_GATEWAY_API_KEY is required/);
  });
});
