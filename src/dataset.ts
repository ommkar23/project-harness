export type TestCase = {
  id: string;
  input: string;
  expectedMustInclude?: string[];
  expectedMustNotInclude?: string[];
  maxWords?: number;
};

export const dataset: TestCase[] = [
  {
    id: 'headline-ecommerce',
    input:
      'Write a concise startup headline for an AI product that improves ecommerce product descriptions.',
    expectedMustInclude: ['AI'],
    expectedMustNotInclude: ['revolutionary'],
    maxWords: 12,
  },
  {
    id: 'headline-finance',
    input:
      'Write a concise startup headline for a B2B SaaS that automates invoice reconciliation for finance teams.',
    expectedMustNotInclude: ['game-changing', 'revolutionary'],
    maxWords: 12,
  },
  {
    id: 'headline-support',
    input:
      'Write a concise startup headline for software that drafts support replies using an internal knowledge base.',
    expectedMustNotInclude: ['synergy'],
    maxWords: 12,
  },
];
