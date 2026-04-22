const API_URL = 'https://ai-gateway.vercel.sh/v1/models';

type GatewayModel = {
  context_window?: number;
  description?: string;
  id: string;
  max_tokens?: number;
  name?: string;
  owned_by?: string;
  pricing?: Record<string, unknown>;
  released?: number;
  tags?: string[];
  type?: string;
};

type GatewayResponse = {
  data?: GatewayModel[];
};

type Options = {
  help: boolean;
  json: boolean;
  provider: null | string;
  type: null | string;
};

type NormalizedModel = {
  contextWindow: null | number;
  description: string;
  id: string;
  maxTokens: null | number;
  name: string;
  pricing: Record<string, unknown>;
  provider: string;
  released: string;
  tags: string[];
  type: string;
};

function parseArgs(argv: string[]): Options {
  const options: Options = {
    provider: null,
    type: null,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--provider') {
      options.provider = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === '--type') {
      options.type = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function formatDate(epochSeconds: number | undefined): string {
  if (!epochSeconds) {
    return '';
  }

  return new Date(epochSeconds * 1000).toISOString().slice(0, 10);
}

function formatInteger(value: number | null): string {
  if (typeof value !== 'number') {
    return '';
  }

  return new Intl.NumberFormat('en-US').format(value);
}

function formatPricing(pricing: Record<string, unknown>): string {
  const parts: string[] = [];

  if (typeof pricing.input === 'string') {
    parts.push(`in:${pricing.input}`);
  }

  if (typeof pricing.output === 'string') {
    parts.push(`out:${pricing.output}`);
  }

  if (typeof pricing.input_cache_read === 'string') {
    parts.push(`cache-read:${pricing.input_cache_read}`);
  }

  if (typeof pricing.input_cache_write === 'string') {
    parts.push(`cache-write:${pricing.input_cache_write}`);
  }

  if (typeof pricing.web_search === 'string') {
    parts.push(`web-search:${pricing.web_search}`);
  }

  if (typeof pricing.per_query === 'string') {
    parts.push(`per-query:${pricing.per_query}`);
  }

  if (typeof pricing.image === 'string') {
    parts.push(`image:${pricing.image}`);
  }

  return parts.join(' ');
}

function normalizeModel(model: GatewayModel): NormalizedModel {
  return {
    id: model.id,
    provider: model.owned_by ?? '',
    name: model.name ?? '',
    type: model.type ?? '',
    released: formatDate(model.released),
    contextWindow: model.context_window ?? null,
    maxTokens: model.max_tokens ?? null,
    tags: Array.isArray(model.tags) ? model.tags : [],
    pricing: model.pricing ?? {},
    description: model.description ?? '',
  };
}

function printHelp(): void {
  console.log(`List live Vercel AI Gateway models.

Usage:
  pnpm models:gateway [--provider google] [--type language] [--json]

Options:
  --provider <name>  Filter by provider/owner, for example "google"
  --type <type>      Filter by model type, for example "language" or "image"
  --json             Print structured JSON instead of a plain-text table
  --help, -h         Show this help text
`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const headers = new Headers({
    Accept: 'application/json',
  });

  if (process.env.AI_GATEWAY_API_KEY) {
    headers.set('Authorization', `Bearer ${process.env.AI_GATEWAY_API_KEY}`);
  }

  const response = await fetch(API_URL, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as GatewayResponse;
  const allModels = Array.isArray(payload.data) ? payload.data : [];

  const filteredModels = allModels
    .filter((model) => options.provider === null || model.owned_by === options.provider)
    .filter((model) => options.type === null || model.type === options.type)
    .map(normalizeModel)
    .sort((left, right) => left.id.localeCompare(right.id));

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          fetchedAt: new Date().toISOString(),
          total: filteredModels.length,
          filters: {
            provider: options.provider,
            type: options.type,
          },
          models: filteredModels,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`Fetched ${filteredModels.length} model(s) from ${API_URL}`);
  console.log('');

  for (const model of filteredModels) {
    const summary = [
      model.id,
      model.type || 'unknown',
      model.released || 'n/a',
      model.contextWindow ? `ctx:${formatInteger(model.contextWindow)}` : null,
      model.maxTokens ? `max:${formatInteger(model.maxTokens)}` : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join(' | ');

    console.log(summary);

    if (model.tags.length > 0) {
      console.log(`  tags: ${model.tags.join(', ')}`);
    }

    const pricing = formatPricing(model.pricing);
    if (pricing) {
      console.log(`  pricing: ${pricing}`);
    }

    if (model.description) {
      console.log(`  description: ${model.description}`);
    }

    console.log('');
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
