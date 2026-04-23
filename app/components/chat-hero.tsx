'use client';

import type { ReactElement } from 'react';

import { ELIGIBLE_MODEL_OPTIONS } from '../../lib/client-models';

type ChatHeroProps = {
  selectedModelId: string;
  setSelectedModelId: (value: string) => void;
};

export function ChatHero({
  selectedModelId,
  setSelectedModelId,
}: ChatHeroProps): ReactElement {
  return (
    <section className="hero">
      <p className="eyebrow">Sandboxed coding harness</p>
      <h1>Chat-backed repo execution with Python inside Vercel Sandbox</h1>
      <p className="lede">
        The assistant can answer directly or execute inline Python in an isolated sandbox that
        pulls the configured GitHub repository. Python code and sandbox output appear as
        collapsible steps in the chat stream.
      </p>
      <div className="modelPicker">
        <label className="modelPickerLabel" htmlFor="modelId">
          Harness model
        </label>
        <select
          className="modelSelect"
          id="modelId"
          onChange={(event) => setSelectedModelId(event.target.value)}
          value={selectedModelId}
        >
          {ELIGIBLE_MODEL_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="modelHint">
          Current harness allowlist: {ELIGIBLE_MODEL_OPTIONS.map((option) => option.id).join(', ')}.
          The default uses <code>openai/gpt-5.4-mini</code> through AI Gateway.
        </p>
      </div>
    </section>
  );
}
