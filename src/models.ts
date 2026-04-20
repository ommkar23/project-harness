import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

export type HarnessModel = {
  id: string;
  model: LanguageModel;
};

const DEFAULT_MODEL_ID = 'gemini-3-flash-preview';

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

export function getDefaultModelId(): string {
  return process.env.GEMINI_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
}

export function getDefaultChatModel(): HarnessModel {
  const google = createGoogleProvider();
  const modelId =
    process.env.GEMINI_CHAT_MODEL_ID?.trim() ||
    process.env.GEMINI_MODEL_ID?.trim() ||
    DEFAULT_MODEL_ID;

  return {
    id: modelId,
    model: google(modelId),
  };
}
