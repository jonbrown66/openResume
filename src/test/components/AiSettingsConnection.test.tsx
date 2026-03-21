import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addToast, testAiProviderConnection } = vi.hoisted(() => ({
  addToast: vi.fn(),
  testAiProviderConnection: vi.fn(),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    addToast,
  }),
}));

vi.mock('@/utils/aiConnection', () => ({
  testAiProviderConnection,
}));

import { AiSettings } from '@/components/settings/AiSettings';
import { DEFAULT_SETTINGS, type AppSettings } from '@/config/settings';

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

describe('AiSettings connection test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a warning when api key is missing', async () => {
    const settings = createSettings({
      activeProvider: 'openai',
      providers: {
        ...DEFAULT_SETTINGS.providers,
        openai: {
          ...DEFAULT_SETTINGS.providers.openai,
          apiKey: '',
        },
      },
    });

    render(
      <AiSettings
        settings={settings}
        onUpdateProvider={vi.fn()}
        onSetActiveProvider={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        'Please enter an API key before testing the model.',
        'warning',
      );
    });
    expect(testAiProviderConnection).not.toHaveBeenCalled();
  });

  it('tests the current provider configuration and reports success', async () => {
    const settings = createSettings({
      activeProvider: 'openai',
      providers: {
        ...DEFAULT_SETTINGS.providers,
        openai: {
          ...DEFAULT_SETTINGS.providers.openai,
          apiKey: 'demo-key',
          model: 'gpt-5-custom-preview',
        },
      },
    });

    testAiProviderConnection.mockResolvedValue(undefined);

    render(
      <AiSettings
        settings={settings}
        onUpdateProvider={vi.fn()}
        onSetActiveProvider={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() => {
      expect(testAiProviderConnection).toHaveBeenCalledWith(settings.providers.openai);
      expect(addToast).toHaveBeenCalledWith(
        'Connection successful. The current model is reachable.',
        'success',
      );
    });
  });
});
