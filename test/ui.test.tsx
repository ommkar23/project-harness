import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HomePage from '../app/page';

const sendMessageMock = vi.fn();
const stopMock = vi.fn();

let mockMessages: Array<Record<string, unknown>> = [];
const fetchMock = vi.fn();

vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: mockMessages,
    sendMessage: sendMessageMock,
    status: 'ready',
    error: null,
    stop: stopMock,
  }),
}));

describe('chat ui', () => {
  beforeEach(() => {
    mockMessages = [];
    sendMessageMock.mockReset();
    stopMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(''),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('submits the current prompt with Cmd+Enter', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    const textarea = screen.getByLabelText('Prompt');
    await user.type(textarea, 'Inspect the sandbox');
    await user.keyboard('{Meta>}{Enter}{/Meta}');

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        { text: 'Inspect the sandbox' },
        { body: { modelId: 'openai/gpt-5.4-mini' } },
      );
    });
  });

  it('calls the reset route and stops streaming when reset is clicked', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: 'Reset Chat + Sandbox' }));

    await waitFor(() => {
      expect(stopMock).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/chat/reset',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  it('renders executePython code and output inline in the chat stream', () => {
    mockMessages = [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'Ran the script.',
          },
          {
            type: 'tool-executePython',
            toolCallId: 'tool-1',
            state: 'output-available',
            input: {
              code: "print('hello')",
            },
            output: {
              stdout: 'hello\n',
              stderr: '',
              exitCode: 0,
              durationMs: 5,
              truncated: false,
            },
          },
        ],
      },
    ];

    render(<HomePage />);

    expect(screen.getByText('Python code')).toBeInTheDocument();
    expect(screen.getByText("print('hello')")).toBeInTheDocument();
    expect(screen.getByText('Code output')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
