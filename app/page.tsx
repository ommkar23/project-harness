'use client';

import type { ReactElement } from 'react';

import { ChatComposer } from './components/chat-composer';
import { ChatHero } from './components/chat-hero';
import { ChatMessageList } from './components/chat-message-list';
import { useChatController } from './hooks/use-chat-controller';

export default function HomePage(): ReactElement {
  const controller = useChatController();

  return (
    <main className="shell">
      <ChatHero
        selectedModelId={controller.selectedModelId}
        setSelectedModelId={controller.setSelectedModelId}
      />

      <section className="chatPanel">
        <ChatMessageList messages={controller.messages} />
        <ChatComposer
          errorMessage={controller.error?.message}
          input={controller.input}
          isResetting={controller.isResetting}
          onChangeInput={controller.setInput}
          onInputKeyDown={controller.handleInputKeyDown}
          onReset={controller.handleReset}
          onSubmit={controller.handleSubmit}
          resetError={controller.resetError ?? undefined}
          status={controller.status}
        />
      </section>
    </main>
  );
}
