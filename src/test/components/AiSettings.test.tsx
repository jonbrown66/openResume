import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

vi.mock('@/utils/aiConnection', () => ({
  testAiProviderConnection: vi.fn(),
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

describe('AiSettings', () => {
  it('shows a custom model input when the current provider uses a non-default model', () => {
    const settings = createSettings({
      activeProvider: 'openai',
      providers: {
        ...DEFAULT_SETTINGS.providers,
        openai: {
          ...DEFAULT_SETTINGS.providers.openai,
          model: 'gpt-5-custom-preview',
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

    expect(screen.getByPlaceholderText('Enter a custom model name...')).toHaveValue(
      'gpt-5-custom-preview',
    );
  });

  it('updates the provider model through the custom model input', () => {
    const settings = createSettings({
      activeProvider: 'openai',
      providers: {
        ...DEFAULT_SETTINGS.providers,
        openai: {
          ...DEFAULT_SETTINGS.providers.openai,
          model: 'gpt-5-custom-preview',
        },
      },
    });
    const onUpdateProvider = vi.fn();

    render(
      <AiSettings
        settings={settings}
        onUpdateProvider={onUpdateProvider}
        onSetActiveProvider={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Enter a custom model name...'), {
      target: { value: 'gpt-5.2-experimental' },
    });

    expect(onUpdateProvider).toHaveBeenCalledWith('openai', { model: 'gpt-5.2-experimental' });
  });

  it('hides the custom model input when a preset model is selected', () => {
    const settings = createSettings({ activeProvider: 'openai' });

    render(
      <AiSettings
        settings={settings}
        onUpdateProvider={vi.fn()}
        onSetActiveProvider={vi.fn()}
      />,
    );

    expect(screen.queryByPlaceholderText('Enter a custom model name...')).not.toBeInTheDocument();
  });

  it('treats every provider default model as a preset', () => {
    const providers = Object.keys(DEFAULT_SETTINGS.providers) as Array<keyof typeof DEFAULT_SETTINGS.providers>;

    providers.forEach((provider) => {
      const { unmount } = render(
        <AiSettings
          settings={createSettings({ activeProvider: provider })}
          onUpdateProvider={vi.fn()}
          onSetActiveProvider={vi.fn()}
        />,
      );

      expect(screen.queryByPlaceholderText('Enter a custom model name...')).not.toBeInTheDocument();
      unmount();
    });
  });
});
