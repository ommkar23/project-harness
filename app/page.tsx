'use client';

import { useState, type FormEvent, type KeyboardEvent, type ReactElement } from 'react';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  ELIGIBLE_MODEL_OPTIONS,
} from '../src/models';

function getMessageText(message: UIMessage): string {
  return message.parts
    .map((part) => {
      if (part.type === 'text') {
        return part.text;
      }

      return '';
    })
    .filter((value) => value.length > 0)
    .join('\n');
}

type ExecutePythonToolPart = Extract<UIMessage['parts'][number], { type: `tool-${string}` }> & {
  type: 'tool-executePython';
};

function isExecutePythonToolPart(part: UIMessage['parts'][number]): part is ExecutePythonToolPart {
  return part.type === 'tool-executePython';
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  const json = JSON.stringify(value, null, 2);

  return json ?? String(value);
}

function extractCode(input: unknown): string {
  if (typeof input === 'object' && input != null && 'code' in input) {
    const value = (input as { code?: unknown }).code;

    if (typeof value === 'string') {
      return value;
    }
  }

  return stringifyValue(input);
}

function formatSandboxOutput(output: unknown): string {
  if (typeof output === 'object' && output != null) {
    const record = output as {
      stderr?: unknown;
      stdout?: unknown;
    };

    if (typeof record.stdout === 'string' && typeof record.stderr === 'string') {
      const sections = [record.stdout, record.stderr]
        .map((value) => value.trimEnd())
        .filter((value) => value.length > 0);

      return sections.length > 0 ? sections.join('\n') : '[empty]';
    }
  }

  return stringifyValue(output);
}

function renderToolPart(part: ExecutePythonToolPart): ReactElement {
  const codeStatus = part.state === 'input-streaming' ? 'streaming' : 'ready';

  return (
    <>
      <details className="toolCard">
        <summary className="toolSummary">
          <span className="toolSummaryTitle">Python code</span>
          <span className="toolPill">{codeStatus}</span>
        </summary>
        <pre className="toolCode">{extractCode(part.input)}</pre>
      </details>

      {part.state === 'output-available' ? (
        <details className="toolCard toolCardOutput">
          <summary className="toolSummary">
            <span className="toolSummaryTitle">Code output</span>
            <span className="toolPill">done</span>
          </summary>
          <pre className="toolCode">{formatSandboxOutput(part.output)}</pre>
        </details>
      ) : null}

      {part.state === 'output-error' ? (
        <details className="toolCard toolCardOutput">
          <summary className="toolSummary">
            <span className="toolSummaryTitle">Code output</span>
            <span className="toolPill toolPillError">error</span>
          </summary>
          <pre className="toolCode">{part.errorText}</pre>
        </details>
      ) : null}

      {part.state === 'output-denied' ? (
        <details className="toolCard toolCardOutput">
          <summary className="toolSummary">
            <span className="toolSummaryTitle">Code output</span>
            <span className="toolPill toolPillError">denied</span>
          </summary>
          <pre className="toolCode">Execution denied.</pre>
        </details>
      ) : null}
    </>
  );
}

const DEFAULT_SELECTED_MODEL_ID = 'openai/gpt-5.4-mini';

function createChatSessionId(): string {
  return globalThis.crypto.randomUUID();
}

function renderMessageBody(message: UIMessage): ReactElement {
  const text = getMessageText(message);

  if (message.role === 'user') {
    return <pre className="messageText">{text.length > 0 ? text : '[non-text response]'}</pre>;
  }

  if (text.length === 0) {
    return <pre className="messageText">[non-text response]</pre>;
  }

  return (
    <div className="markdownMessage">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className, ...rest } = props;
            const codeText = Array.isArray(children)
              ? children
                  .filter((child): child is string => typeof child === 'string')
                  .join('')
              : typeof children === 'string'
                ? children
                : '';
            const isBlock = className != null || codeText.includes('\n');

            if (!isBlock) {
              return (
                <code className="inlineCode" {...rest}>
                  {children}
                </code>
              );
            }

            return (
              <pre className="markdownCodeBlock">
                <code className={className} {...rest}>
                  {children}
                </code>
              </pre>
            );
          },
          a(props) {
            return <a {...props} rel="noreferrer" target="_blank" />;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default function HomePage(): ReactElement {
  const [input, setInput] = useState('');
  const [chatId, setChatId] = useState(createChatSessionId);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_SELECTED_MODEL_ID);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const { messages, sendMessage, status, error, stop } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  async function submitCurrentMessage(): Promise<void> {
    const trimmed = input.trim();

    if (trimmed.length === 0 || status !== 'ready' || isResetting) {
      return;
    }

    setInput('');
    await sendMessage(
      { text: trimmed },
      {
        body: {
          modelId: selectedModelId,
        },
      },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await submitCurrentMessage();
  }

  async function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): Promise<void> {
    if (!event.metaKey || event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    await submitCurrentMessage();
  }

  async function handleReset(): Promise<void> {
    setResetError(null);
    setIsResetting(true);
    void stop();

    try {
      const response = await fetch('/api/chat/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatId }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setInput('');
      setChatId(createChatSessionId());
    } catch (resetFailure) {
      setResetError(
        resetFailure instanceof Error ? resetFailure.message : 'Failed to reset chat session.',
      );
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <main className="shell">
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

      <section className="chatPanel">
        <div className="messageList">
          {messages.length === 0 ? (
            <div className="emptyState">
              Ask the harness to inspect, edit, or run something in the sandboxed repository.
            </div>
          ) : null}

          {messages.map((message) => {
            return (
              <article
                key={message.id}
                className={message.role === 'user' ? 'message userMessage' : 'message'}
              >
                <div className="messageMeta">{message.role === 'user' ? 'User' : 'Harness'}</div>
                {renderMessageBody(message)}
                {message.parts
                  .filter(isExecutePythonToolPart)
                  .map((part) => (
                    <div key={part.toolCallId}>{renderToolPart(part)}</div>
                  ))}
              </article>
            );
          })}
        </div>

        <form
          className="composer"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <textarea
            className="input"
            onKeyDown={(event) => {
              void handleInputKeyDown(event);
            }}
            name="prompt"
            onChange={(event) => setInput(event.target.value)}
            placeholder="Describe the change or inspection you want the harness to carry out."
            rows={5}
            value={input}
          />
          <div className="composerFooter">
            <div className="status">
              <span>Status: {status}</span>
              {error != null ? <span className="error">Error: {error.message}</span> : null}
              {resetError != null ? <span className="error">Reset: {resetError}</span> : null}
            </div>
            <div className="composerActions">
              <button
                className="resetButton"
                disabled={isResetting}
                onClick={() => {
                  void handleReset();
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
      </section>
    </main>
  );
}
