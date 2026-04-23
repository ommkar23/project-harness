'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

import { ELIGIBLE_MODEL_OPTIONS } from '../../lib/client-models';

const DEFAULT_SELECTED_MODEL_ID = ELIGIBLE_MODEL_OPTIONS[0]?.id ?? 'openai/gpt-5.4-mini';

function createChatSessionId(): string {
  return globalThis.crypto.randomUUID();
}

export type ChatController = ReturnType<typeof useChatController>;

export function useChatController() {
  const [input, setInput] = useState('');
  const [chatId, setChatId] = useState(createChatSessionId);
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_SELECTED_MODEL_ID);
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

  return {
    error,
    handleInputKeyDown,
    handleReset,
    handleSubmit,
    input,
    isResetting,
    messages,
    resetError,
    selectedModelId,
    setInput,
    setSelectedModelId,
    status,
  };
}
