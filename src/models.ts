import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

export type HarnessModel = {
  id: string;
  model: LanguageModel;
};

export type GeminiModelOption = {
  description: string;
  id: string;
  label: string;
};

const DEFAULT_MODEL_ID = 'gemini-3-flash-preview';
export const ELIGIBLE_GEMINI_MODEL_OPTIONS: GeminiModelOption[] = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Current Google low-latency price-performance model.',
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Current Google advanced reasoning and coding model.',
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview',
    description: 'Preview Gemini 3 fast model listed in Google API docs.',
  },
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro Preview',
    description: 'Current Google Gemini 3.1 preview reasoning model.',
  },
];

export const INELIGIBLE_GEMINI_MODEL_IDS = {
  'gemini-3-pro-preview': 'Google marks this preview model as shut down on March 9, 2026.',
} as const;

function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey == null || apiKey.length === 0) {
    throw new Error(
      'GEMINI_API_KEY is required. Copy .env.example to .env and add a key before running the harness.',
    );
  }

  return apiKey;
}

function createGoogleProvider() {
  return createGoogleGenerativeAI({ apiKey: getGeminiApiKey() });
}

export function isEligibleGeminiModelId(value: string): boolean {
  return ELIGIBLE_GEMINI_MODEL_OPTIONS.some((option) => option.id === value);
}

export function getDefaultModelId(): string {
  const configuredModelId = process.env.GEMINI_MODEL_ID?.trim();

  if (configuredModelId != null && isEligibleGeminiModelId(configuredModelId)) {
    return configuredModelId;
  }

  return DEFAULT_MODEL_ID;
}

function resolveChatModelId(requestedModelId?: string): string {
  if (requestedModelId != null && isEligibleGeminiModelId(requestedModelId)) {
    return requestedModelId;
  }

  const configuredChatModelId = process.env.GEMINI_CHAT_MODEL_ID?.trim();
  if (configuredChatModelId != null && isEligibleGeminiModelId(configuredChatModelId)) {
    return configuredChatModelId;
  }

  const configuredDefaultModelId = process.env.GEMINI_MODEL_ID?.trim();
  if (configuredDefaultModelId != null && isEligibleGeminiModelId(configuredDefaultModelId)) {
    return configuredDefaultModelId;
  }

  return DEFAULT_MODEL_ID;
}

export function getDefaultChatModel(requestedModelId?: string): HarnessModel {
  const google = createGoogleProvider();
  const modelId = resolveChatModelId(requestedModelId);

  return {
    id: modelId,
    model: google(modelId),
  };
}

export function getEligibleGeminiModelOptions() {
  return ELIGIBLE_GEMINI_MODEL_OPTIONS;
}
