'use client';

import type { ReactElement } from 'react';

import type { UIMessage } from 'ai';

import { isExecutePythonToolPart } from '../../lib/execute-python';
import { ChatMessageBody } from './chat-message-body';
import { ExecutePythonCard } from './execute-python-card';

export function ChatMessageList({ messages }: { messages: UIMessage[] }): ReactElement {
  return (
    <div className="messageList">
      {messages.length === 0 ? (
        <div className="emptyState">
          Ask the harness to inspect, edit, or run something in the sandboxed repository.
        </div>
      ) : null}

      {messages.map((message) => (
        <article
          key={message.id}
          className={message.role === 'user' ? 'message userMessage' : 'message'}
        >
          <div className="messageMeta">{message.role === 'user' ? 'User' : 'Harness'}</div>
          <ChatMessageBody message={message} />
          {message.parts.filter(isExecutePythonToolPart).map((part) => (
            <div key={part.toolCallId}>
              <ExecutePythonCard part={part} />
            </div>
          ))}
        </article>
      ))}
    </div>
  );
}
