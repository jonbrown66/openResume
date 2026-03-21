import type { ApiProvider } from '@/config/settings';

const CONNECTION_TIMEOUT = 20000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number },
): Promise<Response> {
  const { timeout = CONNECTION_TIMEOUT, signal: existingSignal, ...fetchOptions } = options;
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
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

async function readApiError(response: Response, fallbackMessage: string) {
  const error = await response.json().catch(() => ({}));
  return error.error?.message || fallbackMessage;
}

export async function testAiProviderConnection(provider: ApiProvider): Promise<void> {
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
        system: 'Reply with OK.',
        messages: [{ role: 'user', content: 'Connection test. Reply with OK.' }],
        max_tokens: 8,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, 'Anthropic API Error'));
    }
    return;
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
        contents: [{ parts: [{ text: 'Connection test. Reply with OK.' }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 8,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, 'Gemini API Error'));
    }
    return;
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
      headers['X-Title'] = 'Resume Studio';
    }

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Connection test. Reply with OK.' }],
        max_tokens: 8,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, `${provider.name} API Error`));
    }
    return;
  }

  throw new Error('Unsupported provider');
}
