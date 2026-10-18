import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '@/config/settings';
import { parseAssistantEditResponse, requestResumeAssistant } from '@/utils/resumeAssistant';

describe('resumeAssistant', () => {
  const testSettings = { ...DEFAULT_SETTINGS, activeProvider: 'openai' as const, providers: { ...DEFAULT_SETTINGS.providers,
    openai: { ...DEFAULT_SETTINGS.providers.openai, apiKey: 'test-only', model: 'test-model' } } };
  it('sends job context as reference data without requesting a rewritten resume for advice', async () => {
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => new Response(JSON.stringify({ choices: [{ message: { content: 'Role advice' } }] })));
    vi.stubGlobal('fetch', fetchMock);
    const result = await requestResumeAssistant({ mode: 'chat', userMessage: 'Compare my experience', markdown: '# Current resume', lang: 'en', settings: testSettings,
      jobDescription: 'Frontend engineer: React and accessible UI' });
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(options?.body));
    expect(body.messages[1].content).toContain('Frontend engineer: React and accessible UI');
    expect(body.messages[1].content).toContain('# Current resume');
    expect(body.response_format).toBeUndefined();
    expect(result).toEqual({ reply: 'Role advice' });
  });
  it('caps oversized job descriptions before building a provider prompt', async () => {
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => new Response(JSON.stringify({ choices: [{ message: { content: 'Role advice' } }] })));
    vi.stubGlobal('fetch', fetchMock);
    await requestResumeAssistant({
      mode: 'chat',
      userMessage: 'Compare my experience',
      markdown: '# Current resume',
      lang: 'en',
      settings: testSettings,
      jobDescription: 'x'.repeat(13000).replace(/x/, 'y'),
    });
    const prompt = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)).messages[1].content as string;
    expect(prompt).toContain('[Job description truncated');
    expect(prompt.match(/x/g)).toHaveLength(12000);
  });
  it('propagates cancellation to the provider request', async () => {
    let providerSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      providerSignal = options.signal as AbortSignal;
      providerSignal.addEventListener('abort', () => reject(new Error('abort')));
    })));
    const controller = new AbortController();
    const request = requestResumeAssistant({ mode: 'chat', userMessage: 'Review', markdown: '# Resume', lang: 'en', settings: testSettings, signal: controller.signal });
    controller.abort();
    await expect(request).rejects.toThrow('cancelled');
    expect(providerSignal?.aborted).toBe(true);
  });
  it.each([{ reply: 12, markdown: 'text' }, { reply: 'text', markdown: {} }, null])('rejects malformed edit field types: %j', payload => {
    expect(() => parseAssistantEditResponse(JSON.stringify(payload))).toThrow('invalid-edit-response');
  });
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
      text: vi.fn().mockResolvedValue(JSON.stringify({
        choices: [
          {
            message: {
              content: 'Advice from OpenRouter',
            },
          },
        ],
      })),
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
      text: vi.fn().mockResolvedValue(JSON.stringify({
        choices: [
          {
            message: {
              content: 'Advice from OpenRouter',
            },
          },
        ],
      })),
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

  it('removes quoted base64 avatar images before sending assistant prompts to AI', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify({
        choices: [
          {
            message: {
              content: 'Advice from OpenRouter',
            },
          },
        ],
      })),
    });

    vi.stubGlobal('fetch', fetchMock);

    await requestResumeAssistant({
      mode: 'chat',
      userMessage: 'Review this resume.',
      markdown: [
        '---',
        'name: Demo',
        'image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"',
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

  it('restores quoted base64 avatar images in edit responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reply: 'Updated summary.',
                markdown: '---\nname: Demo\nimage: "[avatar]"\n---\n## Experience',
              }),
            },
          },
        ],
      })),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await requestResumeAssistant({
      mode: 'edit',
      userMessage: 'Polish.',
      markdown: [
        '---',
        'name: Demo',
        'image: "data:image/png;base64,iVBORw0KGgoAAAASDFASF"',
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

    expect(result.proposedMarkdown).toContain('image: "data:image/png;base64,iVBORw0KGgoAAAASDFASF"');
  });

  it('sanitizes base64 avatar images in reply field for both edit and chat modes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reply: 'Look at this avatar: data:image/png;base64,iVBORw0KGgoAAAASDFASF',
                markdown: '---\\nname: Demo\\nimage: "[avatar]"\\n---\\n## Experience',
              }),
            },
          },
        ],
      })),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await requestResumeAssistant({
      mode: 'edit',
      userMessage: 'Polish.',
      markdown: '---\nname: Demo\n---',
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

    expect(result.reply).toContain('[avatar]');
    expect(result.reply).not.toContain('iVBORw0KGgo');
  });
});
