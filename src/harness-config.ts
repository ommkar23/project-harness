import { z } from 'zod';

const optionalString = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const DEFAULT_MODEL_ID = 'openai/gpt-5.4-mini';

export const eligibleModelOptions = [
  {
    id: 'openai/gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    description: 'OpenAI fast reasoning and coding model served through AI Gateway.',
  },
] as const satisfies readonly HarnessModelOption[];

export const harnessEnvironmentSchema = z.object({
  AI_GATEWAY_API_KEY: optionalString,
  BRAINTRUST_API_KEY: optionalString,
  HARNESS_REPO_URL: z
    .string()
    .url()
    .default('https://github.com/ommkar23/harness-playground.git'),
  HARNESS_REPO_REVISION: z.string().min(1).default('tools'),
  HARNESS_SANDBOX_TIMEOUT_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  HARNESS_EXECUTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(2 * 60 * 1000),
  HARNESS_EXECUTION_OUTPUT_LIMIT: z.coerce.number().int().positive().default(12_000),
  HARNESS_CHAT_MODEL_ID: optionalString,
  HARNESS_MODEL_ID: optionalString,
  HARNESS_REPO_GIT_PASSWORD: optionalString,
  EXA_API_KEY: optionalString,
  TAVILY_API_KEY: optionalString,
  FIRECRAWL_API_KEY: optionalString,
});

export type HarnessEnvironment = z.infer<typeof harnessEnvironmentSchema>;

export type HarnessModelOption = {
  description: string;
  id: string;
  label: string;
  providerRouting?: string[];
};

export type HarnessModelResolution = {
  defaultModelId: string;
  requestedModelId?: string;
  resolvedModelId: string;
};

export function parseHarnessEnvironment(
  env: Record<string, string | undefined>,
): HarnessEnvironment {
  return harnessEnvironmentSchema.parse(env);
}

export function getEligibleModelOptions(): readonly HarnessModelOption[] {
  return eligibleModelOptions;
}

export function isEligibleModelId(value: string): boolean {
  return eligibleModelOptions.some((option) => option.id === value);
}

export function resolveDefaultModelId(environment: HarnessEnvironment): string {
  if (
    environment.HARNESS_MODEL_ID != null &&
    isEligibleModelId(environment.HARNESS_MODEL_ID)
  ) {
    return environment.HARNESS_MODEL_ID;
  }

  return DEFAULT_MODEL_ID;
}

export function resolveHarnessModel(
  environment: HarnessEnvironment,
  requestedModelId?: string,
): HarnessModelResolution {
  const defaultModelId = resolveDefaultModelId(environment);

  if (requestedModelId != null && isEligibleModelId(requestedModelId)) {
    return {
      defaultModelId,
      resolvedModelId: requestedModelId,
      requestedModelId,
    };
  }

  if (
    environment.HARNESS_CHAT_MODEL_ID != null &&
    isEligibleModelId(environment.HARNESS_CHAT_MODEL_ID)
  ) {
    return {
      defaultModelId,
      resolvedModelId: environment.HARNESS_CHAT_MODEL_ID,
      ...(requestedModelId != null ? { requestedModelId } : {}),
    };
  }

  return {
    defaultModelId,
    resolvedModelId: defaultModelId,
    ...(requestedModelId != null ? { requestedModelId } : {}),
  };
}

export function requireAiGatewayApiKey(environment: HarnessEnvironment): string {
  if (environment.AI_GATEWAY_API_KEY == null) {
    throw new Error(
      'AI_GATEWAY_API_KEY is required. Copy .env.example to .env and add a key before running the harness.',
    );
  }

  return environment.AI_GATEWAY_API_KEY;
}
