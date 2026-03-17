export type ApiProviderId = 'openai' | 'gemini';

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
}

export const DEFAULT_SETTINGS: AppSettings = {
  activeProvider: 'gemini',
  providers: {
    openai: {
      id: 'openai',
      name: 'OpenAI',
      apiKey: '',
      model: 'gpt-5.3',
      baseUrl: 'https://api.openai.com/v1',
    },
    gemini: {
      id: 'gemini',
      name: 'Google Gemini',
      apiKey: '',
      model: 'gemini-3.0-flash',
    },
  },
};
