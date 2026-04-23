'use client';

import type { FormEvent, KeyboardEvent, ReactElement } from 'react';

type ChatComposerProps = {
  errorMessage: string | undefined;
  input: string;
  isResetting: boolean;
  onChangeInput: (value: string) => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => Promise<void>;
  onReset: () => Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  resetError: string | undefined;
  status: string;
};

export function ChatComposer({
  errorMessage,
  input,
  isResetting,
  onChangeInput,
  onInputKeyDown,
  onReset,
  onSubmit,
  resetError,
  status,
}: ChatComposerProps): ReactElement {
  return (
    <form
      className="composer"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <textarea
        aria-label="Prompt"
        className="input"
        onKeyDown={(event) => {
          void onInputKeyDown(event);
        }}
        name="prompt"
        onChange={(event) => onChangeInput(event.target.value)}
        placeholder="Describe the change or inspection you want the harness to carry out."
        rows={5}
        value={input}
      />
      <div className="composerFooter">
        <div className="status">
          <span>Status: {status}</span>
          {errorMessage != null ? <span className="error">Error: {errorMessage}</span> : null}
          {resetError != null ? <span className="error">Reset: {resetError}</span> : null}
        </div>
        <div className="composerActions">
          <button
            className="resetButton"
            disabled={isResetting}
            onClick={() => {
              void onReset();
            }}
            type="button"
          >
            {isResetting ? 'Resetting...' : 'Reset Chat + Sandbox'}
          </button>
          <button className="sendButton" disabled={status !== 'ready' || isResetting} type="submit">
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
