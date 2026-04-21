import { z } from 'zod';

const optionalString = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const runtimeConfigSchema = z.object({
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
  TAVILY_API_KEY: optionalString,
  HARNESS_REPO_GIT_PASSWORD: optionalString,
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

let runtimeConfigCache: RuntimeConfig | null = null;

export function getRuntimeConfig(): RuntimeConfig {
  runtimeConfigCache ??= runtimeConfigSchema.parse(process.env);
  return runtimeConfigCache;
}
