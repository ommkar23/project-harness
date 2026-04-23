import { createGateway, type LanguageModel } from 'ai';

import {
  getEligibleModelOptions,
  parseHarnessEnvironment,
  requireAiGatewayApiKey,
  resolveDefaultModelId,
  resolveHarnessModel,
  type HarnessEnvironment,
} from '../src/harness-config';

export type ServerChatModel = {
  id: string;
  model: LanguageModel;
  providerOptions?: {
    gateway: {
      order: string[];
    };
  };
};

let harnessEnvironmentCache: HarnessEnvironment | null = null;

export function getHarnessEnvironment(): HarnessEnvironment {
  harnessEnvironmentCache ??= parseHarnessEnvironment(process.env);
  return harnessEnvironmentCache;
}

export function resetHarnessEnvironmentCacheForTests(): void {
  harnessEnvironmentCache = null;
}

export function getDefaultModelId(): string {
  return resolveDefaultModelId(getHarnessEnvironment());
}

export function resolveServerChatModel(requestedModelId?: string): ServerChatModel {
  const environment = getHarnessEnvironment();
  const { resolvedModelId } = resolveHarnessModel(environment, requestedModelId);
  const providerOrder = getEligibleModelOptions().find(
    (option) => option.id === resolvedModelId,
  )?.providerRouting;
  const aiGateway = createGateway({ apiKey: requireAiGatewayApiKey(environment) });

  return {
    id: resolvedModelId,
    model: aiGateway(resolvedModelId),
    ...(providerOrder != null && providerOrder.length > 0
      ? {
          providerOptions: {
            gateway: {
              order: providerOrder,
            },
          },
        }
      : {}),
  };
}
