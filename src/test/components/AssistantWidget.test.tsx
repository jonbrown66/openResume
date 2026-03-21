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
        settings={createSettings()}
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
    const providerMeta = screen.getByText(/Google Gemini/);

    expect(memoryHint).toHaveClass('text-right');
    expect(memoryHint.parentElement).toBe(providerMeta.parentElement);
    expect(memoryHint.parentElement).toHaveClass('flex', 'items-center', 'justify-between');
    expect(
      screen.getByPlaceholderText('Describe how the assistant should revise your resume...'),
    ).toBeInTheDocument();
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
});
