import type { AppSettings, ApiProvider } from '@/config/settings';
import type { AppLanguage } from '@/config/ui';

const REQUEST_TIMEOUT = 60000;

export type ResumeAssistantMode = 'chat' | 'edit';

export interface ResumeAssistantHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface ResumeAssistantRequest {
  mode: ResumeAssistantMode;
  userMessage: string;
  markdown: string;
  lang: AppLanguage;
  settings: AppSettings;
  history?: ResumeAssistantHistoryItem[];
}

export interface ResumeAssistantResponse {
  reply: string;
  proposedMarkdown?: string;
}

class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number },
): Promise<Response> {
  const { timeout = REQUEST_TIMEOUT, signal: existingSignal, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: existingSignal || controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/^```(?:json|markdown)?\s*([\s\S]*?)```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function buildHistoryText(history: ResumeAssistantHistoryItem[] = []): string {
  if (history.length === 0) {
    return 'No previous conversation.';
  }

  return history
    .slice(-6)
    .map((item) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
    .join('\n');
}

function getSystemPrompt(mode: ResumeAssistantMode, lang: AppLanguage): string {
  if (mode === 'edit') {
    return lang === 'zh'
      ? '你是一名保守的简历编辑助手。你只能优化措辞、结构、标题和要点表达。除非用户明确要求，否则严禁改动工作经历顺序、任职时间、公司名称、学校名称，也不能编造新信息。你必须返回完整简历 Markdown，并严格只返回 JSON 对象。'
      : 'You are a conservative resume editing assistant. Only improve wording, structure, headings, and bullet phrasing. Unless the user explicitly asks, do not change work experience order, dates, company names, school names, or invent facts. Return the full revised resume markdown and output JSON only.';
  }

  return lang === 'zh'
    ? '你是一名专业的简历顾问。你会结合当前简历内容，给出直接、具体、可执行的建议。'
    : 'You are a professional resume advisor. Use the current resume to provide direct, specific, actionable guidance.';
}

function sanitizeMarkdownForAi(markdown: string): string {
  return markdown
    .replace(/image: data:image\/[^;]+;base64,[^\n]+/g, 'image: [avatar]')
    .replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[^)]+\)/g, '![$1](avatar)');
}

function getUserPrompt({
  mode,
  userMessage,
  markdown,
  history,
  lang,
}: Omit<ResumeAssistantRequest, 'settings'>): string {
  const sanitizedMarkdown = sanitizeMarkdownForAi(markdown);

  if (mode === 'edit') {
    return `
Current conversation:
${buildHistoryText(history)}

Current resume markdown:
${sanitizedMarkdown}

User instruction:
${userMessage}

Return a JSON object only with this exact shape:
{
  "reply": "${lang === 'zh' ? '简要说明你修改了什么' : 'Short explanation of what you changed'}",
  "markdown": "${lang === 'zh' ? '修改后的完整简历 Markdown' : 'The full revised resume markdown'}"
}

Rules:
1. Keep valid markdown.
2. Preserve YAML frontmatter and overall resume structure.
3. Return the full revised resume, not a partial diff.
4. Do not change work experience order or dates unless the user explicitly asks.
5. Do not invent achievements, durations, titles, companies, or schools.
6. Do not wrap the JSON in prose.
7. Keep [avatar] placeholders as-is in the frontmatter image field.
`.trim();
  }

  return `
Current conversation:
${buildHistoryText(history)}

Current resume markdown:
${sanitizedMarkdown}

User question:
${userMessage}

Respond in ${lang === 'zh' ? 'Chinese' : 'English'} with practical advice based on the resume above.
`.trim();
}

async function readApiError(response: Response, fallbackMessage: string) {
  const error = await response.json().catch(() => ({}));
  return error.error?.message || fallbackMessage;
}

async function sendPromptToProvider(
  provider: ApiProvider,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const apiKey = provider.apiKey.trim();
  const model = provider.model.trim();

  if (!apiKey) {
    throw new Error('missing-api-key');
  }

  if (!model) {
    throw new Error('missing-model');
  }

  if (provider.id === 'anthropic') {
    const endpoint = provider.baseUrl?.endsWith('/')
      ? provider.baseUrl
      : `${provider.baseUrl || 'https://api.anthropic.com/v1'}/`;

    const response = await fetchWithTimeout(`${endpoint}messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new ApiError(await readApiError(response, 'Anthropic API Error'), response.status);
    }

    const data = await response.json();
    return data.content?.[0]?.text?.trim() || '';
  }

  if (provider.id === 'gemini') {
    const baseUrl = provider.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    const endpoint = `${baseUrl.replace(/\/$/, '')}/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      throw new ApiError(await readApiError(response, 'Gemini API Error'), response.status);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }

  if (['openai', 'deepseek', 'openrouter'].includes(provider.id)) {
    let baseUrl = provider.baseUrl || 'https://api.openai.com/v1';

    if (!baseUrl.includes('/v1') && !baseUrl.includes('/chat/completions')) {
      baseUrl = baseUrl.endsWith('/') ? `${baseUrl}v1` : `${baseUrl}/v1`;
    }

    const endpoint = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };

    if (provider.id === 'openrouter') {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-OpenRouter-Title'] = 'Resume Studio';
    }

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new ApiError(await readApiError(response, `${provider.name} API Error`), response.status);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  throw new Error('Unsupported provider');
}

export function parseAssistantEditResponse(text: string): ResumeAssistantResponse {
  const normalizedText = stripCodeFence(text);
  const jsonMatch = normalizedText.match(/\{[\s\S]*\}/);
  const rawPayload = (jsonMatch?.[0] || normalizedText).trim();

  let payload: {
    reply?: string;
    markdown?: string;
  };

  try {
    payload = JSON.parse(rawPayload) as {
      reply?: string;
      markdown?: string;
    };
  } catch {
    const repairedMatch = rawPayload.match(
      /^\{\s*"reply"\s*:\s*"([\s\S]*?)"\s*,\s*"markdown"\s*:\s*"([\s\S]*?)"\s*\}$/i,
    );

    if (!repairedMatch) {
      throw new Error('invalid-edit-response');
    }

    payload = {
      reply: repairedMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .trim(),
      markdown: repairedMatch[2]
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .trim(),
    };
  }

  if (!payload.reply?.trim() || !payload.markdown?.trim()) {
    throw new Error('invalid-edit-response');
  }

  return {
    reply: payload.reply.trim(),
    proposedMarkdown: payload.markdown.trim(),
  };
}

function restoreAvatarInMarkdown(proposedMarkdown: string, originalMarkdown: string): string {
  const avatarMatch = originalMarkdown.match(/image:\s*(data:image\/[^;]+;base64,[^\n]+)/);
  if (!avatarMatch) {
    return proposedMarkdown;
  }
  
  const originalAvatar = avatarMatch[1];
  return proposedMarkdown.replace(/image:\s*\[avatar\]/g, `image: ${originalAvatar}`);
}

export async function requestResumeAssistant({
  mode,
  userMessage,
  markdown,
  lang,
  settings,
  history = [],
}: ResumeAssistantRequest): Promise<ResumeAssistantResponse> {
  const provider = settings.providers[settings.activeProvider];
  const rawText = await sendPromptToProvider(
    provider,
    getSystemPrompt(mode, lang),
    getUserPrompt({ mode, userMessage, markdown, lang, history }),
  );

  if (mode === 'edit') {
    const result = parseAssistantEditResponse(rawText);
    if (result.proposedMarkdown) {
      result.proposedMarkdown = restoreAvatarInMarkdown(result.proposedMarkdown, markdown);
    }
    return result;
  }

  return {
    reply: stripCodeFence(rawText),
  };
}
