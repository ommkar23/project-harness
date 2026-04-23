'use client';

import type { ReactElement } from 'react';

import type { UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function getMessageText(message: UIMessage): string {
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

export function ChatMessageBody({ message }: { message: UIMessage }): ReactElement {
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
