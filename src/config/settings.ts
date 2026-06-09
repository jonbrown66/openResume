export type ApiProviderId = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter';

export interface ApiProvider {
  id: ApiProviderId;
  name: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface AppSettings {
  activeProvider: ApiProviderId;
  providers: Record<ApiProviderId, ApiProvider>;
  theme: 'light' | 'dark' | 'system';
  language: 'zh' | 'en';
}

export const DEFAULT_SETTINGS: AppSettings = {
  activeProvider: 'gemini',
  theme: 'system',
  language: 'zh',
  providers: {
    openai: {
      id: 'openai',
      name: 'OpenAI',
      apiKey: '',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
    },
    anthropic: {
      id: 'anthropic',
      name: 'Anthropic',
      apiKey: '',
      model: 'claude-3-5-sonnet-latest',
      baseUrl: 'https://api.anthropic.com/v1',
    },
    gemini: {
      id: 'gemini',
      name: 'Google Gemini',
      apiKey: '',
      model: 'gemini-1.5-flash',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    },
    deepseek: {
      id: 'deepseek',
      name: 'DeepSeek',
      apiKey: '',
      model: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com/v1',
    },
    openrouter: {
      id: 'openrouter',
      name: 'OpenRouter',
      apiKey: '',
      model: 'google/gemini-flash-1.5',
      baseUrl: 'https://openrouter.ai/api/v1',
    },
  },
};
