import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addToast, requestResumeAssistant } = vi.hoisted(() => ({
  addToast: vi.fn(),
  requestResumeAssistant: vi.fn(),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    addToast,
  }),
}));

vi.mock('@/utils/resumeAssistant', () => ({
  requestResumeAssistant,
}));

import { AssistantWidget } from '@/components/AssistantWidget';
import { DEFAULT_SETTINGS, type AppSettings } from '@/config/settings';
import { translations } from '@/config/ui';
import { defaultMarkdownEn } from '@/constants';

function createSettings(overrides?: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    language: 'en',
    ...overrides,
    providers: {
      ...DEFAULT_SETTINGS.providers,
      ...overrides?.providers,
    },
  };
}

describe('AssistantWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('opens the floating assistant panel without showing mode switches', () => {
    render(
      <AssistantWidget
        lang="en"
        markdown={defaultMarkdownEn}
        projectId="project-a"
        settings={createSettings({
          activeProvider: 'gemini',
          providers: {
            ...DEFAULT_SETTINGS.providers,
            gemini: {
              ...DEFAULT_SETTINGS.providers.gemini,
              apiKey: 'demo-key',
            },
          },
        })}
        translations={translations.en}
        onApplyMarkdown={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));

    expect(screen.getByRole('heading', { name: 'Resume Assistant' })).toBeInTheDocument();
    expect(screen.getByText('I am your resume editing assistant. How can I help you?')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Tell AI how you want the resume revised. It will generate a candidate version, show a diff, and wait for confirmation before applying it.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ask Anything' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Resume' })).not.toBeInTheDocument();
    const memoryHint = screen.getByText('Only the latest 20 messages are kept.');
    const providerMeta = screen.getAllByText(/Google Gemini/).at(-1)!;

    expect(memoryHint).toHaveClass('text-right');
    expect(memoryHint.parentElement).toBe(providerMeta.parentElement);
    expect(memoryHint.parentElement).toHaveClass('flex', 'items-center', 'justify-between');
    expect(
      screen.getByPlaceholderText('Describe how the assistant should revise your resume...'),
    ).toBeInTheDocument();
  });

  it('uses a responsive bottom sheet layout for the assistant panel', () => {
    render(
      <AssistantWidget
        lang="en"
        markdown={defaultMarkdownEn}
        projectId="project-a"
        settings={createSettings()}
        translations={translations.en}
        onApplyMarkdown={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));

    const panel = screen.getByRole('dialog', { name: 'Resume Assistant' });
    const conversation = screen.getByTestId('assistant-conversation');

    expect(panel).toHaveClass(
      'h-[min(720px,calc(100dvh-5.5rem))]',
      'w-[calc(100vw-1rem)]',
      'sm:h-[min(680px,calc(100dvh-3rem))]',
      'sm:w-[min(540px,calc(100vw-2rem))]',
    );
    expect(conversation).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(conversation).not.toHaveClass('sm:h-[440px]', 'sm:flex-none');
  });

  it('keeps the mobile launcher above the bottom view switcher', () => {
    render(
      <AssistantWidget
        lang="en"
        markdown={defaultMarkdownEn}
        projectId="project-a"
        settings={createSettings()}
        translations={translations.en}
        onApplyMarkdown={vi.fn()}
      />,
    );

    const launcher = screen.getByRole('button', { name: 'Open AI assistant' });
    const floatingLayer = launcher.parentElement;

    expect(floatingLayer).toHaveClass(
      'bottom-[calc(5.25rem+env(safe-area-inset-bottom))]',
      'z-[70]',
    );
    expect(floatingLayer).not.toHaveClass('z-40');
  });

  it('does not show the launcher button immediately while the panel is closing', () => {
    render(
      <AssistantWidget
        lang="en"
        markdown={defaultMarkdownEn}
        projectId="project-a"
        settings={createSettings()}
        translations={translations.en}
        onApplyMarkdown={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close AI assistant' }));

    expect(screen.queryByRole('button', { name: 'Open AI assistant' })).not.toBeInTheDocument();
  });

  it('shows a diff preview and only applies the proposal after confirmation', async () => {
    const onApplyMarkdown = vi.fn();
    requestResumeAssistant.mockResolvedValue({
      reply: 'I tightened the summary wording and clarified the impact.',
      proposedMarkdown:
        '---\nname: Jane Doe\ntitle: Product Designer\ncontact: jane@example.com\n---\n\n## PROFESSIONAL SUMMARY\nSharper summary',
    });

    render(
      <AssistantWidget
        lang="en"
        markdown={
          '---\nname: Jane Doe\ntitle: Product Designer\ncontact: jane@example.com\n---\n\n## PROFESSIONAL SUMMARY\nOriginal summary'
        }
        projectId="project-a"
        settings={createSettings({
          activeProvider: 'openai',
          providers: {
            ...DEFAULT_SETTINGS.providers,
            openai: {
              ...DEFAULT_SETTINGS.providers.openai,
              apiKey: 'demo-key',
              model: 'gpt-5.2',
            },
          },
        })}
        translations={translations.en}
        onApplyMarkdown={onApplyMarkdown}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));
    fireEvent.change(screen.getByPlaceholderText('Describe how the assistant should revise your resume...'), {
      target: { value: 'Rewrite the summary to sound more strategic.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(requestResumeAssistant).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'edit',
          userMessage: 'Rewrite the summary to sound more strategic.',
        }),
      );
    });

    expect(await screen.findByText('I tightened the summary wording and clarified the impact.')).toBeInTheDocument();
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getByText('Original summary')).toBeInTheDocument();
    expect(screen.getByText('Sharper summary')).toBeInTheDocument();

    expect(onApplyMarkdown).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Apply to Resume' }));

    expect(onApplyMarkdown).toHaveBeenCalledWith(
      '---\nname: Jane Doe\ntitle: Product Designer\ncontact: jane@example.com\n---\n\n## PROFESSIONAL SUMMARY\nSharper summary',
    );
    expect(addToast).toHaveBeenCalledWith('Assistant changes applied to the resume.', 'success');
  });

  it('warns about risky proposals but still allows manual apply', async () => {
    requestResumeAssistant.mockResolvedValue({
      reply: 'I reordered the experience and refreshed the dates.',
      proposedMarkdown: `---
name: Jane Doe
title: Product Designer
contact: jane@example.com
---

## WORK EXPERIENCE

### Senior Designer | 2024 - Present
**Beta Inc**
- Led redesigns

### Product Designer | 2021 - 2024
**Acme**
- Shipped core features`,
    });

    render(
      <AssistantWidget
        lang="en"
        markdown={`---
name: Jane Doe
title: Product Designer
contact: jane@example.com
---

## WORK EXPERIENCE

### Product Designer | 2021 - 2024
**Acme**
- Shipped core features

### Senior Designer | 2024 - Present
**Beta Inc**
- Led redesigns`}
        projectId="project-a"
        settings={createSettings({
          activeProvider: 'openai',
          providers: {
            ...DEFAULT_SETTINGS.providers,
            openai: {
              ...DEFAULT_SETTINGS.providers.openai,
              apiKey: 'demo-key',
              model: 'gpt-5.2',
            },
          },
        })}
        translations={translations.en}
        onApplyMarkdown={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));
    fireEvent.change(screen.getByPlaceholderText('Describe how the assistant should revise your resume...'), {
      target: { value: 'Improve the work experience section.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      await screen.findByText((_, element) =>
        element?.textContent ===
        'High-risk changes detected: work experience order changed; work experience dates changed.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply to Resume' })).toBeInTheDocument();
  });

  it('warns the user when the current provider has no api key', async () => {
    render(
      <AssistantWidget
        lang="en"
        markdown={defaultMarkdownEn}
        projectId="project-a"
        settings={createSettings({
          activeProvider: 'openai',
          providers: {
            ...DEFAULT_SETTINGS.providers,
            openai: {
              ...DEFAULT_SETTINGS.providers.openai,
              apiKey: '',
            },
          },
        })}
        translations={translations.en}
        onApplyMarkdown={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));
    fireEvent.change(screen.getByPlaceholderText('Describe how the assistant should revise your resume...'), {
      target: { value: 'How can I improve this resume?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        'Please configure an API key before using the assistant.',
        'warning',
      );
    });

    expect(requestResumeAssistant).not.toHaveBeenCalled();
  });

  it('shows the current provider model and opens settings when AI is not configured', () => {
    render(
      <AssistantWidget
        lang="en"
        markdown={defaultMarkdownEn}
        projectId="project-a"
        settings={createSettings({
          activeProvider: 'anthropic',
          providers: {
            ...DEFAULT_SETTINGS.providers,
            anthropic: {
              ...DEFAULT_SETTINGS.providers.anthropic,
              apiKey: '',
              model: 'claude-opus-4-8',
            },
          },
        })}
        translations={translations.en}
        onApplyMarkdown={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));

    expect(screen.queryByText('Anthropic · claude-opus-4-8')).not.toBeInTheDocument();
    expect(screen.getByText('The current AI provider is not fully configured. Configure it before using the assistant.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('AI Provider')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to chat' }));
    expect(screen.getByRole('heading', { name: 'Resume Assistant' })).toBeInTheDocument();
    expect(screen.queryByText('AI Provider')).not.toBeInTheDocument();
  });

  it('restores assistant conversation after remount for the same project', async () => {
    requestResumeAssistant.mockResolvedValue({
      reply: 'I rewrote the summary with a stronger leadership tone.',
      proposedMarkdown:
        '---\nname: Jane Doe\ntitle: Product Designer\ncontact: jane@example.com\n---\n\n## PROFESSIONAL SUMMARY\nUpdated summary',
    });

    const { unmount } = render(
      <AssistantWidget
        lang="en"
        markdown={
          '---\nname: Jane Doe\ntitle: Product Designer\ncontact: jane@example.com\n---\n\n## PROFESSIONAL SUMMARY\nOriginal summary'
        }
        projectId="project-memory"
        settings={createSettings({
          activeProvider: 'openai',
          providers: {
            ...DEFAULT_SETTINGS.providers,
            openai: {
              ...DEFAULT_SETTINGS.providers.openai,
              apiKey: 'demo-key',
              model: 'gpt-5.2',
            },
          },
        })}
        translations={translations.en}
        onApplyMarkdown={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));
    fireEvent.change(screen.getByPlaceholderText('Describe how the assistant should revise your resume...'), {
      target: { value: 'Make the summary sound more strategic.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('I rewrote the summary with a stronger leadership tone.')).toBeInTheDocument();

    unmount();

    render(
      <AssistantWidget
        lang="en"
        markdown={
          '---\nname: Jane Doe\ntitle: Product Designer\ncontact: jane@example.com\n---\n\n## PROFESSIONAL SUMMARY\nOriginal summary'
        }
        projectId="project-memory"
        settings={createSettings()}
        translations={translations.en}
        onApplyMarkdown={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));

    expect(screen.getByText('Make the summary sound more strategic.')).toBeInTheDocument();
    expect(screen.getByText('I rewrote the summary with a stronger leadership tone.')).toBeInTheDocument();
  });

  it('keeps assistant memory isolated per resume project', async () => {
    requestResumeAssistant.mockResolvedValue({
      reply: 'I updated the summary.',
      proposedMarkdown:
        '---\nname: Jane Doe\ntitle: Product Designer\ncontact: jane@example.com\n---\n\n## PROFESSIONAL SUMMARY\nUpdated summary',
    });

    const { rerender } = render(
      <AssistantWidget
        lang="en"
        markdown={
          '---\nname: Jane Doe\ntitle: Product Designer\ncontact: jane@example.com\n---\n\n## PROFESSIONAL SUMMARY\nOriginal summary'
        }
        projectId="project-a"
        settings={createSettings({
          activeProvider: 'openai',
          providers: {
            ...DEFAULT_SETTINGS.providers,
            openai: {
              ...DEFAULT_SETTINGS.providers.openai,
              apiKey: 'demo-key',
              model: 'gpt-5.2',
            },
          },
        })}
        translations={translations.en}
        onApplyMarkdown={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));
    fireEvent.change(screen.getByPlaceholderText('Describe how the assistant should revise your resume...'), {
      target: { value: 'Revise project A summary.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('I updated the summary.')).toBeInTheDocument();

    rerender(
      <AssistantWidget
        lang="en"
        markdown={defaultMarkdownEn}
        projectId="project-b"
        settings={createSettings()}
        translations={translations.en}
        onApplyMarkdown={vi.fn()}
      />,
    );

    expect(screen.queryByText('Revise project A summary.')).not.toBeInTheDocument();
    expect(screen.getByText('I am your resume editing assistant. How can I help you?')).toBeInTheDocument();
  });

  it('hides diff preview and apply button when the AI response has no markdown changes (advice-only mode)', async () => {
    requestResumeAssistant.mockResolvedValue({
      reply: 'Here are some suggestions: 1. Add metrics; 2. Use stronger verbs.',
      proposedMarkdown: '---\nname: Jane Doe\ntitle: Product Designer\ncontact: jane@example.com\n---\n\n## PROFESSIONAL SUMMARY\nOriginal summary',
    });

    render(
      <AssistantWidget
        lang="en"
        markdown={
          '---\nname: Jane Doe\ntitle: Product Designer\ncontact: jane@example.com\n---\n\n## PROFESSIONAL SUMMARY\nOriginal summary'
        }
        projectId="project-advice-only"
        settings={createSettings({
          activeProvider: 'openai',
          providers: {
            ...DEFAULT_SETTINGS.providers,
            openai: {
              ...DEFAULT_SETTINGS.providers.openai,
              apiKey: 'demo-key',
              model: 'gpt-5.2',
            },
          },
        })}
        translations={translations.en}
        onApplyMarkdown={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));
    fireEvent.change(screen.getByPlaceholderText('Describe how the assistant should revise your resume...'), {
      target: { value: 'How can I optimize my summary?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Here are some suggestions: 1. Add metrics; 2. Use stronger verbs.')).toBeInTheDocument();
    expect(screen.queryByText('Before')).not.toBeInTheDocument();
    expect(screen.queryByText('After')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply to Resume' })).not.toBeInTheDocument();
  });

  it('allows the user to clear chat history and clears assistant messages', async () => {
    requestResumeAssistant.mockResolvedValue({
      reply: 'Sure, here is the suggestion.',
      proposedMarkdown: '---\nname: Jane Doe\n---\n\n## PROFESSIONAL SUMMARY\nNew summary',
    });

    render(
      <AssistantWidget
        lang="en"
        markdown={'---\nname: Jane Doe\n---\n\n## PROFESSIONAL SUMMARY\nOriginal summary'}
        projectId="project-clear-test"
        settings={createSettings({
          activeProvider: 'openai',
          providers: {
            ...DEFAULT_SETTINGS.providers,
            openai: {
              ...DEFAULT_SETTINGS.providers.openai,
              apiKey: 'demo-key',
              model: 'gpt-5.2',
            },
          },
        })}
        translations={translations.en}
        onApplyMarkdown={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));

    expect(screen.queryByRole('button', { name: 'Clear History' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Describe how the assistant should revise your resume...'), {
      target: { value: 'Revise summary.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Sure, here is the suggestion.')).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: 'Clear History' });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);

    expect(screen.queryByRole('button', { name: 'Clear History' })).not.toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: '确认清空' });
    const cancelBtn = screen.getByRole('button', { name: '取消' });
    expect(confirmBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();

    fireEvent.click(confirmBtn);

    expect(screen.queryByText('Revise summary.')).not.toBeInTheDocument();
    expect(screen.queryByText('Sure, here is the suggestion.')).not.toBeInTheDocument();
    expect(addToast).toHaveBeenCalledWith('Chat history cleared.', 'success');

    expect(screen.queryByRole('button', { name: 'Clear History' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认清空' })).not.toBeInTheDocument();
  });

  it('does not clear history if the user cancels confirmation', async () => {
    requestResumeAssistant.mockResolvedValue({
      reply: 'Sure, here is the suggestion.',
      proposedMarkdown: '---\nname: Jane Doe\n---\n\n## PROFESSIONAL SUMMARY\nNew summary',
    });

    render(
      <AssistantWidget
        lang="en"
        markdown={'---\nname: Jane Doe\n---\n\n## PROFESSIONAL SUMMARY\nOriginal summary'}
        projectId="project-clear-cancel"
        settings={createSettings({
          activeProvider: 'openai',
          providers: {
            ...DEFAULT_SETTINGS.providers,
            openai: {
              ...DEFAULT_SETTINGS.providers.openai,
              apiKey: 'demo-key',
              model: 'gpt-5.2',
            },
          },
        })}
        translations={translations.en}
        onApplyMarkdown={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open AI assistant' }));

    fireEvent.change(screen.getByPlaceholderText('Describe how the assistant should revise your resume...'), {
      target: { value: 'Revise summary.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Sure, here is the suggestion.')).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: 'Clear History' });
    fireEvent.click(clearBtn);

    const cancelBtn = screen.getByRole('button', { name: '取消' });
    fireEvent.click(cancelBtn);

    expect(screen.getByText('Revise summary.')).toBeInTheDocument();
    expect(screen.getByText('Sure, here is the suggestion.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear History' })).toBeInTheDocument();
  });
});
