import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '@/config/settings';
import { parseAssistantEditResponse, requestResumeAssistant } from '@/utils/resumeAssistant';

describe('resumeAssistant', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses edit responses wrapped in a json code block', () => {
    const result = parseAssistantEditResponse(`\`\`\`json
{"reply":"Updated the summary.","markdown":"## PROFESSIONAL SUMMARY\nUpdated"}
\`\`\``);

    expect(result).toEqual({
      reply: 'Updated the summary.',
      proposedMarkdown: '## PROFESSIONAL SUMMARY\nUpdated',
    });
  });

  it('rejects assistant requests when the active model is empty', async () => {
    await expect(
      requestResumeAssistant({
        mode: 'chat',
        userMessage: 'Review this resume.',
        markdown: '# Resume',
        lang: 'en',
        settings: {
          ...DEFAULT_SETTINGS,
          activeProvider: 'openai',
          providers: {
            ...DEFAULT_SETTINGS.providers,
            openai: {
              ...DEFAULT_SETTINGS.providers.openai,
              apiKey: 'demo-key',
              model: '   ',
            },
          },
        },
      }),
    ).rejects.toThrow('missing-model');
  });

  it('uses the documented OpenRouter title header for assistant requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Advice from OpenRouter',
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await requestResumeAssistant({
      mode: 'chat',
      userMessage: 'Review this resume.',
      markdown: '# Resume',
      lang: 'en',
      settings: {
        ...DEFAULT_SETTINGS,
        activeProvider: 'openrouter',
        providers: {
          ...DEFAULT_SETTINGS.providers,
          openrouter: {
            ...DEFAULT_SETTINGS.providers.openrouter,
            apiKey: 'sk-or-v1-demo',
            model: 'minimax/minimax-m2.5:free',
            baseUrl: 'https://openrouter.ai/api/v1',
          },
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-or-v1-demo',
          'HTTP-Referer': 'http://localhost:3000',
          'X-OpenRouter-Title': 'Resume Studio',
        }),
      }),
    );
  });

  it('removes base64 avatar images before sending assistant prompts to AI', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Advice from OpenRouter',
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await requestResumeAssistant({
      mode: 'chat',
      userMessage: 'Review this resume.',
      markdown: [
        '---',
        'name: Demo',
        'image: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
        '---',
        '## Experience',
      ].join('\n'),
      lang: 'en',
      settings: {
        ...DEFAULT_SETTINGS,
        activeProvider: 'openrouter',
        providers: {
          ...DEFAULT_SETTINGS.providers,
          openrouter: {
            ...DEFAULT_SETTINGS.providers.openrouter,
            apiKey: 'sk-or-v1-demo',
            model: 'openai/gpt-5-mini',
            baseUrl: 'https://openrouter.ai/api/v1',
          },
        },
      },
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const prompt = requestBody.messages[1].content as string;

    expect(prompt).not.toContain('data:image');
    expect(prompt).not.toContain('iVBORw0KGgo');
    expect(prompt).toContain('image: [avatar]');
  });
});
