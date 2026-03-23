import type { AppLanguage } from '@/config/ui';
import type { AppSettings } from '@/config/settings';

const REQUEST_TIMEOUT = 60000;

class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
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

export async function aiFormatResume(
  rawText: string,
  lang: AppLanguage,
  settings: AppSettings
): Promise<string> {
  const provider = settings.providers[settings.activeProvider];
  
  if (!provider.apiKey) {
    throw new Error('missing-api-key');
  }

  const model = provider.model?.trim();
  if (!model) {
    throw new Error('missing-model');
  }

  const prompt = getFormatPrompt(lang, rawText);

  if (provider.id === 'anthropic') {
    const endpoint = provider.baseUrl?.endsWith('/') 
      ? provider.baseUrl 
      : `${provider.baseUrl || 'https://api.anthropic.com/v1'}/`;
       
    const response = await fetchWithTimeout(`${endpoint}messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        system: 'You are an expert resume formatter.',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(error.error?.message || 'Anthropic API Error', response.status);
    }

    const data = await response.json();
    return cleanMarkdown(data.content[0]?.text || '');
  }

  if (provider.id === 'gemini') {
    const baseUrl = provider.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    const endpoint = `${baseUrl.replace(/\/$/, '')}/models/${model}:generateContent?key=${provider.apiKey}`;

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(error.error?.message || 'Gemini API Error', response.status);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return cleanMarkdown(text);
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
      'Authorization': `Bearer ${provider.apiKey}`,
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
          { role: 'system', content: 'You are an expert resume formatter.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(error.error?.message || `${provider.name} API Error`, response.status);
    }

    const data = await response.json();
    return cleanMarkdown(data.choices[0]?.message?.content || '');
  }

  throw new Error('Unsupported provider');
}

function getFormatPrompt(lang: AppLanguage, rawText: string) {
  return `
You are a resume formatter. Your task is to clean and structure the raw resume text into clean Markdown format.

## Core Principles:
1. **Content is King**: Preserve ALL original content - do not delete, summarize, or reorganize sections
2. **Identify Structure**: Recognize sections like Work Experience, Projects, Education, Skills, Certifications, Languages, Awards, Interests, etc.
3. **Clean Formatting Only**: Apply consistent Markdown formatting without changing the meaning

## Formatting Rules:
1. Extract name, title, and contact info into YAML frontmatter (between --- markers)
2. Use ## for section headings (keep original section names)
3. Use ### for entry titles (job titles, project names, degrees, etc.)
4. Use **bold** for organization names (companies, schools)
5. Use - for bullet points
6. Preserve dates in their original format
7. Keep the original order of sections

## Example Output Structure:
---
name: [Extracted Name]
title: [Extracted Title]
contact: [Extracted Contact Info]
---

## [Original Section Name 1]
### [Entry Title] | [Dates if present]
**[Organization Name]**
- [Content bullet points]

## [Original Section Name 2]
[Section content]

## Important:
- Output in ${lang === 'en' ? 'English' : 'Chinese'}
- Do NOT add sections that don't exist in the original
- Do NOT remove any sections from the original
- Do NOT change the order of sections
- Do NOT include markdown code fences

Here is the raw resume text:
${rawText}
`;
}

function cleanMarkdown(text: string) {
  return text
    .replace(/^```markdown\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}
