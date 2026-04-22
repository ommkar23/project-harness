import { createGateway, type LanguageModel } from 'ai';

export type HarnessModel = {
  id: string;
  model: LanguageModel;
  providerOptions?: {
    gateway: {
      order: string[];
    };
  };
};

export type HarnessModelOption = {
  description: string;
  id: string;
  label: string;
  providerRouting?: string[];
};

const DEFAULT_MODEL_ID = 'openai/gpt-5.4-mini';

export const ELIGIBLE_MODEL_OPTIONS: HarnessModelOption[] = [
  {
    id: 'openai/gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    description: 'OpenAI fast reasoning and coding model served through AI Gateway.',
  },
];

function getAiGatewayApiKey(): string {
  const apiKey = process.env.AI_GATEWAY_API_KEY;

  if (apiKey == null || apiKey.length === 0) {
    throw new Error(
      'AI_GATEWAY_API_KEY is required. Copy .env.example to .env and add a key before running the harness.',
    );
  }

  return apiKey;
}

export function isEligibleModelId(value: string): boolean {
  return ELIGIBLE_MODEL_OPTIONS.some((option) => option.id === value);
}

export function getDefaultModelId(): string {
  const configuredModelId = process.env.HARNESS_MODEL_ID?.trim();

  if (configuredModelId != null && isEligibleModelId(configuredModelId)) {
    return configuredModelId;
  }

  return DEFAULT_MODEL_ID;
}

function resolveChatModelId(requestedModelId?: string): string {
  if (requestedModelId != null && isEligibleModelId(requestedModelId)) {
    return requestedModelId;
  }

  const configuredChatModelId = process.env.HARNESS_CHAT_MODEL_ID?.trim();
  if (configuredChatModelId != null && isEligibleModelId(configuredChatModelId)) {
    return configuredChatModelId;
  }

  const configuredDefaultModelId = process.env.HARNESS_MODEL_ID?.trim();
  if (configuredDefaultModelId != null && isEligibleModelId(configuredDefaultModelId)) {
    return configuredDefaultModelId;
  }

  return DEFAULT_MODEL_ID;
}

export function getDefaultChatModel(requestedModelId?: string): HarnessModel {
  const modelId = resolveChatModelId(requestedModelId);
  const modelOption = ELIGIBLE_MODEL_OPTIONS.find((option) => option.id === modelId);
  const providerOrder = modelOption?.providerRouting;
  const aiGateway = createGateway({ apiKey: getAiGatewayApiKey() });

  return {
    id: modelId,
    model: aiGateway(modelId),
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

export function getEligibleModelOptions() {
  return ELIGIBLE_MODEL_OPTIONS;
}
