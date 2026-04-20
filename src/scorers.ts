import type { TestCase } from './dataset.js';

export type DeterministicScore = {
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

export function scoreDeterministic(
  testCase: TestCase,
  output: string,
): DeterministicScore {
  const normalizedOutput = output.toLowerCase();

  const mustIncludePass =
    testCase.expectedMustInclude == null ||
    testCase.expectedMustInclude.every((token) =>
      normalizedOutput.includes(token.toLowerCase()),
    );

  const mustNotIncludePass =
    testCase.expectedMustNotInclude == null ||
    testCase.expectedMustNotInclude.every(
      (token) => !normalizedOutput.includes(token.toLowerCase()),
    );

  const wordCount = output.trim().split(/\s+/).filter(Boolean).length;
  const concisePass = testCase.maxWords == null || wordCount <= testCase.maxWords;

  const maxScore = 3;
  const score =
    Number(mustIncludePass) + Number(mustNotIncludePass) + Number(concisePass);

  return {
    score,
    maxScore,
    passed: score === maxScore,
    checks: {
      mustIncludePass,
      mustNotIncludePass,
      concisePass,
      wordCount,
    },
  };
}
