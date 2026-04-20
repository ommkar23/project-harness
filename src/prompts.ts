export type PromptVariant = {
  id: string;
  system: string;
  iteration?: number;
  parentId?: string;
};

export const promptVariants: PromptVariant[] = [
  {
    id: 'baseline',
    system:
      'You are a precise startup copywriter. Return exactly one sentence. Be specific, concise, and avoid hype.',
  },
  {
    id: 'plain-english',
    system:
      'You are a precise startup copywriter. Write one plain-English headline. Avoid hype, avoid buzzwords, and keep the language concrete.',
  },
];
