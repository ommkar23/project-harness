'use client';

import { useState, type FormEvent, type ReactElement } from 'react';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';

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

export default function HomePage(): ReactElement {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmed = input.trim();

    if (trimmed.length === 0) {
      return;
    }

    setInput('');
    await sendMessage({ text: trimmed });
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
      </section>

      <section className="chatPanel">
        <div className="messageList">
          {messages.length === 0 ? (
            <div className="emptyState">
              Ask the harness to inspect, edit, or run something in the sandboxed repository.
            </div>
          ) : null}

          {messages.map((message) => {
            const text = getMessageText(message);

            return (
              <article
                key={message.id}
                className={message.role === 'user' ? 'message userMessage' : 'message'}
              >
                <div className="messageMeta">{message.role === 'user' ? 'User' : 'Harness'}</div>
                <pre className="messageText">{text.length > 0 ? text : '[non-text response]'}</pre>
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
            </div>
            <button className="sendButton" disabled={status !== 'ready'} type="submit">
              Send
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
