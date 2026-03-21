import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Eye, EyeOff, Sparkles, Wand2, Globe } from 'lucide-react';
import type { AppSettings, ApiProviderId } from '@/config/settings';
import { translations } from '@/config/ui';
import { 
  Select, 
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { testAiProviderConnection } from '@/utils/aiConnection';

interface AiSettingsProps {
  settings: AppSettings;
  onUpdateProvider: (id: ApiProviderId, updates: Partial<AppSettings['providers'][keyof AppSettings['providers']]>) => void;
  onSetActiveProvider: (id: ApiProviderId) => void;
}

const PROVIDERS: { id: ApiProviderId; nameKey: string; icon: React.ReactNode }[] = [
  { id: 'openai', nameKey: 'OpenAI', icon: <Sparkles size={14} className="opacity-70" /> },
  { id: 'anthropic', nameKey: 'Anthropic', icon: <Cpu size={14} className="opacity-70" /> },
  { id: 'gemini', nameKey: 'Gemini', icon: <Sparkles size={14} className="opacity-70" /> },
  { id: 'deepseek', nameKey: 'DeepSeek', icon: <Cpu size={14} className="opacity-70" /> },
  { id: 'openrouter', nameKey: 'OpenRouter', icon: <Globe size={14} className="opacity-70" /> },
];

const DEFAULT_MODELS: Record<ApiProviderId, string[]> = {
  openai: ['gpt-5.2', 'gpt-5.2-pro', 'gpt-5-mini', 'gpt-5'],
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-3-7-sonnet-20250219'],
  gemini: ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro-preview', 'gemini-2.5-flash-preview'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v3.2', 'deepseek-r1'],
  openrouter: ['anthropic/claude-opus-4-6', 'openai/gpt-5.2', 'google/gemini-3-pro-preview', 'deepseek/deepseek-chat'],
};

const ENDPOINT_PLACEHOLDERS: Record<ApiProviderId, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  deepseek: 'https://api.deepseek.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

const CUSTOM_MODEL_VALUE = '__custom_model__';

export function AiSettings({ settings, onUpdateProvider, onSetActiveProvider }: AiSettingsProps) {
  const [showKey, setShowKey] = useState(false);
  const [testingProviderId, setTestingProviderId] = useState<ApiProviderId | null>(null);
  const [customModelModes, setCustomModelModes] = useState<Partial<Record<ApiProviderId, boolean>>>({});
  const currentProviderId = settings.activeProvider;
  const currentProvider = settings.providers[currentProviderId];
  const t = translations[settings.language];
  const { addToast } = useToast();

  const availableModels = useMemo(() => {
    return Array.from(new Set(DEFAULT_MODELS[currentProviderId] || []));
  }, [currentProviderId]);

  const isStoredCustomModel = Boolean(
    currentProvider.model && !availableModels.includes(currentProvider.model),
  );
  const isCustomModel = customModelModes[currentProviderId] ?? isStoredCustomModel;
  const selectedModelValue = isCustomModel ? CUSTOM_MODEL_VALUE : currentProvider.model || '';
  const isTestingCurrentProvider = testingProviderId === currentProviderId;

  const handleModelChange = (value: string | null) => {
    if (!value) {
      setCustomModelModes((prev) => ({ ...prev, [currentProviderId]: false }));
      onUpdateProvider(currentProviderId, { model: undefined });
      return;
    }

    if (value === CUSTOM_MODEL_VALUE) {
      setCustomModelModes((prev) => ({ ...prev, [currentProviderId]: true }));
      return;
    }

    setCustomModelModes((prev) => ({ ...prev, [currentProviderId]: false }));
    onUpdateProvider(currentProviderId, { model: value || undefined });
  };

  const handleConnectionTest = async () => {
    const providerSnapshot = {
      ...currentProvider,
      apiKey: currentProvider.apiKey.trim(),
      model: currentProvider.model.trim(),
      baseUrl: currentProvider.baseUrl?.trim(),
    };

    if (!providerSnapshot.apiKey) {
      addToast(t.aiConnectionMissingApiKey, 'warning');
      return;
    }

    if (!providerSnapshot.model) {
      addToast(t.aiConnectionMissingModel, 'warning');
      return;
    }

    setTestingProviderId(currentProviderId);

    try {
      await testAiProviderConnection(providerSnapshot);
      addToast(t.aiConnectionSuccess, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addToast(`${t.aiConnectionFailed}: ${message}`, 'error');
    } finally {
      setTestingProviderId((prev) => (prev === currentProviderId ? null : prev));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="space-y-2.5">
        <Label className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
          {t.aiProvider}
        </Label>
        <Select 
          value={currentProviderId} 
          onValueChange={(val) => onSetActiveProvider(val as ApiProviderId)}
        >
          <SelectTrigger className="w-full h-12 rounded-lg border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 px-4 focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            {PROVIDERS.map(p => (
              <SelectItem key={p.id} value={p.id} className="rounded-lg">
                <span className="flex items-center gap-2">
                  {p.icon}
                  {p.nameKey}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2.5">
        <Label className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
          {t.aiApiKey}
        </Label>
        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            value={currentProvider.apiKey}
            onChange={(e) => onUpdateProvider(currentProviderId, { apiKey: e.target.value })}
            placeholder={t.aiApiKeyPlaceholder}
            className="w-full h-12 rounded-lg border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 px-4 pr-12 focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10"
          />
          <button 
            type="button" 
            onClick={() => setShowKey(!showKey)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 ml-1">
          {t.aiApiKeySecurity}
        </p>
      </div>

      <div className="space-y-2.5">
        <Label className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
          {t.aiEndpoint}
        </Label>
        <Input
          value={currentProvider.baseUrl || ENDPOINT_PLACEHOLDERS[currentProviderId]}
          onChange={(e) => onUpdateProvider(currentProviderId, { baseUrl: e.target.value })}
          className="w-full h-12 rounded-lg border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 px-4 focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10"
        />
      </div>

      <div className="space-y-2.5">
        <Label className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
          {t.aiModel}
        </Label>
        <Select 
          value={selectedModelValue}
          onValueChange={handleModelChange}
        >
          <SelectTrigger className="w-full h-12 rounded-lg border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 px-4 focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            {availableModels.map(m => (
              <SelectItem key={m} value={m} className="rounded-lg">{m}</SelectItem>
            ))}
            <SelectItem value={CUSTOM_MODEL_VALUE} className="rounded-lg">
              {t.aiModelCustomOption}
            </SelectItem>
          </SelectContent>
        </Select>
        {isCustomModel ? (
          <Input
            value={currentProvider.model || ''}
            onChange={(e) => {
              setCustomModelModes((prev) => ({ ...prev, [currentProviderId]: true }));
              onUpdateProvider(currentProviderId, { model: e.target.value });
            }}
            placeholder={t.aiModelCustomPlaceholder}
            className="w-full h-12 rounded-lg border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 px-4 focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10"
          />
        ) : null}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg border-zinc-200/80 bg-white/70 dark:border-zinc-800/80 dark:bg-zinc-950/50"
            onClick={handleConnectionTest}
            disabled={isTestingCurrentProvider}
          >
            <Wand2 size={14} />
            {isTestingCurrentProvider ? t.aiTestingConnection : t.aiTestConnection}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
