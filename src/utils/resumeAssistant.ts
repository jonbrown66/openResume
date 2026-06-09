import type { AppSettings, ApiProvider } from '@/config/settings';
import type { AppLanguage } from '@/config/ui';
import { sanitizeMarkdownImagesForAi } from '@/utils/aiMarkdownSanitizer';

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
      ? `你是一名殿堂级简历修改专家和资深求职顾问。你的任务是将用户简历中的经历和项目描述重构为高信息密度、专业且符合真实人类优秀写作习惯的高质量简历。

请严格遵守以下重写原则：
1. 【彻底清除 AI 腔调 (Anti-AI-isms)】
   - 严禁使用虚浮时髦词汇与空洞套话：
     * 高危禁用词汇：深入研究 (delve)、以...为证 (testament to)、织锦/画卷 (tapestry)、协同/协同效应 (synergy)、前沿 (cutting-edge)、简化/优化 (streamline - 除非接具体流程)、革命性的 (revolutionary)、培养 (foster - 除非带教新人)、充满活力的 (vibrant)、蓬勃发展的 (thriving)、生态系统 (ecosystem)、在快速变化的环境下。
     * 禁用空洞 intensifiers（修饰词）：成功地 (successfully)、积极地 (actively)、优秀地 (exceptionally)、显著地 (significantly)。
   - 避免使用弱动词开头，将“负责……”、“参与……”、“协助……”等替换为具体的行为强动作动词（如“主导”、“重构”、“设计”、“交付”、“缩短”、“提升”）。
   - 杜绝 Uniformity（句式单一排比结构），引入长短句交替，使表达像手写一样自然、富有节奏感。

2. 【强制 STAR 与 Google XYZ 成果重写】
   - 每一个工作/项目要点描述必须采用 XYZ 结构：“量化结果 (Result/X) + 业务影响 (Impact/Y) + 实施路径/所用技术 (Action/Z)”。例如：“通过主导微服务重构 (Z)，将核心接口响应耗时降低 50% (X)，从而改善高并发下的用户流失率并降低 15% 服务器开销 (Y)”。
   - 优先将最亮眼的量化成果和影响放在句首以抓住眼球。
   - 【挖掘独家秘密 (Earned Secrets)】：突出具体的专业名词、技术细节和独特的技术方案，而不是泛泛而谈。
   - 【严禁捏造虚假业绩数据】。若原简历缺少量化数据，应构建清晰的动作与结果逻辑，并在缺失的数据处留出中括号占位符（例如：“提升了 [具体百分比]%” 或 “支撑了 [数万] 级高并发”），引导用户后续补全。

3. 【资历对齐 (Seniority Calibration)】
   - 根据简历候选人的工龄和级别自动校准表达高度：
     * 初级 (Junior)：侧重“高效执行、编码规范、功能按时交付与 Bug 修复”。
     * 高级 (Senior)：侧重“架构设计、性能调优、Ownership、核心系统重构与团队带教”。
     * 专家/总监级 (Principal/Lead)：侧重“技术战略演进、降本增效（如降低服务器云成本）、跨团队业务协同与组织商业价值贡献”。

4. 【岗位需求精准对齐 (JD Keyword Alignment)】
   - 如果用户输入中包含目标岗位描述 (Job Description / JD) 或相关职责关键词，自动对其进行需求解码，提取核心技术栈、职责高频词以及隐藏潜台词。
   - 在不偏离求职者真实经历的大前提下，将简历中的技能词、描述重点和关键字与 JD 进行精准的“关键词匹配对齐 (Keyword Alignment)”，提升简历的 ATS 筛选通过率。

5. 【返回格式约束】
   - 必须保留简历的完整 Markdown 格式，保持原有的 YAML Frontmatter 结构和 [avatar] 占位符。
   - 严格只返回指定的 JSON 对象，不要附加任何 JSON 以外的解释文本。`
      : `You are a principal resume writer and recruitment expert. Your task is to rewrite the user's resume into a high-density, professional, and human-sounding document.

Please strictly enforce these rewrite rules:
1. 【Avoid AI Writing Patterns (Anti-AI-isms)】
   - DO NOT use generic, bloated, or hype-filled language (e.g., "fast-paced world", "delve", "testament to", "synergy", "vibrant", "revolutionized", "ecosystem", "tapestry", "realm", "paradigm", "cutting-edge").
   - Remove fluff, qualifiers (e.g., "successfully", "actively"), and passive phrases like "Responsible for...".
   - Use active voice and strong action verbs (e.g., "Led", "Architected", "Refactored", "Halved", "Migrated", "Delivered").
   - Vary sentence structures and lengths to avoid robotic uniformity.

2. 【STAR & Google XYZ Bullet Refinement】
   - For every bullet point under work experience or projects, enforce: What you accomplished [X], as measured by [Y], by doing [Z].
   - Put the outcome/result (metrics/Y) first if possible to catch the recruiter's eye.
   - Highlight "Earned Secrets" — specific technical solutions, unique domain insights, and concrete architectural choices instead of generic boilerplate.
   - DO NOT hallucinate fake numbers. If the original description lacks metrics, construct the sentence logically, place a bracketed placeholder like "[X%]" or "[Y,000 Users]", and instruct the user to fill it.

3. 【Seniority Calibration】
   - Calibrate wording to candidate seniority: Junior focuses on delivery and execution; Senior focuses on architecture, mentorship, and system optimization; Lead/Principal focuses on business strategy, organization alignment, and dollar impact.

4. 【JD Keyword Alignment】
   - If the user's input contains a target Job Description (JD) or specific role keywords, decode the JD requirements and align the resume's bullets to match those keywords.

5. 【Response Format】
   - Preserve YAML frontmatter, markdown sections, and keep [avatar] placeholders as-is.
   - Return a JSON object only. Do not wrap the JSON in prose.`;
  }

  return lang === 'zh'
    ? '你是一名专业的简历顾问。你会结合当前简历内容，给出直接、具体、可执行的建议。'
    : 'You are a professional resume advisor. Use the current resume to provide direct, specific, actionable guidance.';
}

function getUserPrompt({
  mode,
  userMessage,
  markdown,
  history,
  lang,
}: Omit<ResumeAssistantRequest, 'settings'>): string {
  const sanitizedMarkdown = sanitizeMarkdownImagesForAi(markdown);

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
  "reply": "${lang === 'zh' ? '简要说明你修改了什么，并列出你在简历中留出的待填量化数据占位符清单' : 'Short explanation of what you changed, listing the bracketed metric placeholders you left for the user'}",
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
  jsonMode: boolean = false,
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
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
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
  const avatarMatch = originalMarkdown.match(/image:\s*(['"]?data:image\/[^;]+;base64,[A-Za-z0-9+/=\s\r\n]+['"]?)/i);
  if (!avatarMatch) {
    return proposedMarkdown;
  }
  
  const originalAvatar = avatarMatch[1];
  return proposedMarkdown.replace(/image:\s*['"]?\[avatar\]['"]?/g, `image: ${originalAvatar}`);
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
    mode === 'edit',
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
