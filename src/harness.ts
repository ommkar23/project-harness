import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { generateText, Output } from 'ai';
import { z } from 'zod';

import { dataset } from './dataset.js';
import { getModels } from './models.js';
import { type PromptVariant, promptVariants } from './prompts.js';
import { scoreDeterministic } from './scorers.js';

export type HarnessRow = {
  runId: string;
  testCaseId: string;
  promptId: string;
  modelId: string;
  input: string;
  output: string;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  score: number;
  maxScore: number;
  passed: boolean;
  checks: {
    mustIncludePass: boolean;
    mustNotIncludePass: boolean;
    concisePass: boolean;
    wordCount: number;
  };
};

export type HarnessSummaryRow = {
  promptId: string;
  modelId: string;
  passed: number;
  total: number;
  averageScore: number;
};

export type HarnessSummary = {
  runId: string;
  generatedAt: string;
  optimization: {
    maxIterations: number;
    completedIterations: number;
    stoppedReason: 'max-iterations' | 'no-improvement';
  };
  rows: HarnessRow[];
  summary: HarnessSummaryRow[];
};

type PromptEvaluation = {
  prompt: PromptVariant;
  rows: HarnessRow[];
  summary: HarnessSummaryRow[];
};

function definedUsage(result: Awaited<ReturnType<typeof generateText>>['usage']): {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
} {
  const usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  } = {};

  if (result?.inputTokens != null) {
    usage.inputTokens = result.inputTokens;
  }

  if (result?.outputTokens != null) {
    usage.outputTokens = result.outputTokens;
  }

  if (result?.totalTokens != null) {
    usage.totalTokens = result.totalTokens;
  }

  return usage;
}

function createRunId(): string {
  return `run_${new Date().toISOString().replaceAll(':', '-').replace('.', '-')}`;
}

function summarize(rows: HarnessRow[]): HarnessSummaryRow[] {
  const groups = new Map<
    string,
    {
      promptId: string;
      modelId: string;
      passed: number;
      total: number;
      totalScore: number;
    }
  >();

  for (const row of rows) {
    const key = `${row.promptId}__${row.modelId}`;
    const current = groups.get(key) ?? {
      promptId: row.promptId,
      modelId: row.modelId,
      passed: 0,
      total: 0,
      totalScore: 0,
    };

    current.passed += Number(row.passed);
    current.total += 1;
    current.totalScore += row.score / row.maxScore;
    groups.set(key, current);
  }

  return [...groups.values()].map((group) => ({
    promptId: group.promptId,
    modelId: group.modelId,
    passed: group.passed,
    total: group.total,
    averageScore: Number((group.totalScore / group.total).toFixed(3)),
  }));
}

function compareSummaryRows(a: HarnessSummaryRow, b: HarnessSummaryRow): number {
  if (a.averageScore !== b.averageScore) {
    return b.averageScore - a.averageScore;
  }

  return b.passed - a.passed;
}

function rankEvaluation(a: PromptEvaluation, b: PromptEvaluation): number {
  const aSummary = a.summary[0];
  const bSummary = b.summary[0];

  if (aSummary == null || bSummary == null) {
    return 0;
  }

  return compareSummaryRows(aSummary, bSummary);
}

function buildImprovementContext(evaluation: PromptEvaluation): string {
  const failedRows = evaluation.rows.filter((row) => !row.passed);

  if (failedRows.length === 0) {
    return 'No failures. Preserve what works and make only minimal refinements.';
  }

  return failedRows
    .map((row) => {
      const reasons = [
        row.checks.mustIncludePass ? null : 'missing required phrase',
        row.checks.mustNotIncludePass ? null : 'used banned phrase',
        row.checks.concisePass ? null : `too long at ${row.checks.wordCount} words`,
      ]
        .filter((reason): reason is string => reason != null)
        .join(', ');

      return [
        `Test case: ${row.testCaseId}`,
        `Input: ${row.input}`,
        `Output: ${row.output}`,
        `Failure reasons: ${reasons}`,
      ].join('\n');
    })
    .join('\n\n');
}

async function evaluatePrompt(
  runId: string,
  prompt: PromptVariant,
): Promise<PromptEvaluation> {
  const models = getModels();
  const rows: HarnessRow[] = [];

  for (const modelEntry of models) {
    for (const testCase of dataset) {
      const result = await generateText({
        model: modelEntry.model,
        system: prompt.system,
        prompt: testCase.input,
        maxRetries: 2,
        experimental_telemetry: {
          isEnabled: true,
          functionId: 'project-harness',
          metadata: { runId, promptId: prompt.id, testCaseId: testCase.id, modelId: modelEntry.id },
        },
      });

      const scoring = scoreDeterministic(testCase, result.text);

      rows.push({
        runId,
        testCaseId: testCase.id,
        promptId: prompt.id,
        modelId: modelEntry.id,
        input: testCase.input,
        output: result.text,
        usage: definedUsage(result.usage),
        score: scoring.score,
        maxScore: scoring.maxScore,
        passed: scoring.passed,
        checks: scoring.checks,
      });
    }
  }

  return {
    prompt,
    rows,
    summary: summarize(rows).sort(compareSummaryRows),
  };
}

async function improvePrompt(
  runId: string,
  evaluation: PromptEvaluation,
  iteration: number,
): Promise<PromptVariant> {
  const [model] = getModels();

  if (model == null) {
    throw new Error('No models configured for prompt optimization.');
  }

  const schema = z.object({
    system: z
      .string()
      .min(1)
      .describe('A revised system prompt for the copywriting task.'),
    rationale: z
      .string()
      .min(1)
      .describe('Short explanation of how the prompt was improved.'),
  });

  const { experimental_output: object } = await generateText({
    model: model.model,
    output: Output.object({ schema }),
    maxRetries: 2,
    system:
      'You improve system prompts for a copywriting evaluation harness. Return a tighter replacement system prompt that improves the score without changing the task.',
    prompt: [
      `Current prompt id: ${evaluation.prompt.id}`,
      `Current system prompt: ${evaluation.prompt.system}`,
      `Current score summary: ${JSON.stringify(evaluation.summary[0] ?? null)}`,
      'Failure details:',
      buildImprovementContext(evaluation),
      'Produce a revised system prompt that keeps the output to exactly one concise headline and addresses the failure pattern.',
    ].join('\n\n'),
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'project-harness-prompt-optimizer',
      metadata: { runId, sourcePromptId: evaluation.prompt.id, iteration, modelId: model.id },
    },
  });

  return {
    id: `iter-${iteration}`,
    system: object.system,
    iteration,
    parentId: evaluation.prompt.id,
  };
}

export async function runHarness(maxIterations = 5): Promise<HarnessSummary> {
  const runId = createRunId();
  const allRows: HarnessRow[] = [];
  const evaluations: PromptEvaluation[] = [];
  let candidate: PromptVariant = promptVariants[0] ?? {
    id: 'baseline',
    system:
      'You are a precise startup copywriter. Return exactly one sentence. Be specific, concise, and avoid hype.',
  };
  let bestEvaluation: PromptEvaluation | null = null;
  let completedIterations = 0;
  let stoppedReason: HarnessSummary['optimization']['stoppedReason'] =
    'max-iterations';

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    if (iteration === 1 && promptVariants.length > 1) {
      const seedEvaluations = await Promise.all(
        promptVariants.map((prompt) => evaluatePrompt(runId, prompt)),
      );

      evaluations.push(...seedEvaluations);

      for (const evaluation of seedEvaluations) {
        allRows.push(...evaluation.rows);
      }

      seedEvaluations.sort(rankEvaluation);
      const currentBest = seedEvaluations[0];

      if (currentBest == null) {
        break;
      }

      bestEvaluation = currentBest;
      candidate = currentBest.prompt;
      completedIterations = iteration;
    } else {
      const evaluation = await evaluatePrompt(runId, candidate);
      evaluations.push(evaluation);
      allRows.push(...evaluation.rows);
      completedIterations = iteration;

      if (bestEvaluation != null && rankEvaluation(evaluation, bestEvaluation) >= 0) {
        stoppedReason = 'no-improvement';
        break;
      }

      bestEvaluation = evaluation;
    }

    if (iteration === maxIterations || bestEvaluation == null) {
      break;
    }

    candidate = await improvePrompt(runId, bestEvaluation, iteration + 1);
  }

  const output: HarnessSummary = {
    runId,
    generatedAt: new Date().toISOString(),
    optimization: {
      maxIterations,
      completedIterations,
      stoppedReason,
    },
    rows: allRows,
    summary: evaluations
      .flatMap((evaluation) => evaluation.summary)
      .sort(compareSummaryRows),
  };

  await mkdir(join(process.cwd(), 'dist', 'runs'), { recursive: true });
  await writeFile(
    join(process.cwd(), 'dist', 'runs', `${runId}.json`),
    `${JSON.stringify(output, null, 2)}\n`,
    'utf8',
  );

  return output;
}
