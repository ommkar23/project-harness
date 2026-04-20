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
          pulls the configured GitHub repository.
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
