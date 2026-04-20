import { config as loadEnv } from 'dotenv';

import { runHarness } from './harness.js';

loadEnv();

async function main(): Promise<void> {
  const result = await runHarness();

  console.log(`Run: ${result.runId}`);
  console.log(
    `Optimization: ${result.optimization.completedIterations}/${result.optimization.maxIterations} iterations, stopped=${result.optimization.stoppedReason}`,
  );

  for (const group of result.summary) {
    const percentage = ((group.passed / group.total) * 100).toFixed(1);
    console.log(
      `${group.promptId} / ${group.modelId}: ${group.passed}/${group.total} passed (${percentage}%), avg=${group.averageScore}`,
    );
  }
}

void main();
