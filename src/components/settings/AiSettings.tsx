import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Eye, EyeOff, Sparkles, Wand2, Globe, RefreshCw } from 'lucide-react';
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

import { testAiProviderConnection } from '@/utils/aiConnection';
import { useModelCatalog } from '@/hooks/useModelCatalog';

export interface AiSettingsProps {
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
  openai: ['gpt-5.2', 'gpt-5.2-pro', 'gpt-5.1', 'gpt-5-mini', 'gpt-5-nano'],
  anthropic: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  gemini: ['gemini-3-pro-preview', 'gemini-3-flash-preview'],
  deepseek: ['deepseek-v4-pro', 'deepseek-v4-flash'],
  openrouter: [
    'anthropic/claude-opus-4.8',
    'openai/gpt-5.5',
    'openai/gpt-5.4',
    'google/gemini-3.5-flash',
    'google/gemini-3-pro-preview',
    'deepseek/deepseek-v4-pro',
    'deepseek/deepseek-v4-flash',
  ],
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
  const [modelMenu, setModelMenu] = useState<string[] | null>(null);
  const currentProviderId = settings.activeProvider;
  const currentProvider = settings.providers[currentProviderId];
  const t = translations[settings.language];
  const { addToast } = useToast();
  const catalog = useModelCatalog(currentProvider);
  const zh = settings.language === 'zh';
  const catalogStatus = catalog.loading ? (zh ? '正在检查模型…' : 'Checking models…')
    : catalog.error ? (catalog.error === 'auth' ? (zh ? '获取失败，请检查 API Key 和权限。' : 'Check your API key and permissions.')
      : catalog.error === 'unsupported' ? (zh ? '此接口不支持获取模型，可手动填写。' : 'This endpoint cannot list models. Enter a model manually.')
        : (zh ? '暂时无法更新，已保留已有列表，可重试或手动填写。' : 'Could not update. Previous list kept; retry or enter a model manually.'))
      : '';

  const availableModels = useMemo(() => {
    return Array.from(new Set(catalog.models ? [...catalog.models, currentProvider.model].filter(Boolean) : DEFAULT_MODELS[currentProviderId] || []));
  }, [currentProviderId, catalog.models, currentProvider.model]);
  const modelOptions = modelMenu ?? availableModels;

  const isStoredCustomModel = Boolean(
    currentProvider.model && !availableModels.includes(currentProvider.model),
  );
  const isCustomModel = customModelModes[currentProviderId] ?? isStoredCustomModel;
  const selectedModelValue = isCustomModel ? CUSTOM_MODEL_VALUE : currentProvider.model || '';
  const isTestingCurrentProvider = testingProviderId === currentProviderId;

  const handleModelChange = (value: string | null) => {
    if (!value) {
      // Catalog changes must never clear the user's stored selection.
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
      className="space-y-6"
    >
      <div className="space-y-2.5">
        <Label className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
          {t.aiProvider}
        </Label>
        <Select
          items={PROVIDERS.map(provider => ({ value: provider.id, label: provider.nameKey }))}
          value={currentProviderId}
          onValueChange={(val) => onSetActiveProvider(val as ApiProviderId)}
        >
          <SelectTrigger aria-label={t.aiProvider} className="w-full h-12 rounded-lg border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 focus:ring-1 focus:ring-[var(--app-accent)]/35">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-[var(--app-border)] bg-[var(--app-surface)]">
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
            aria-label={t.aiApiKey}
            type={showKey ? "text" : "password"}
            value={currentProvider.apiKey}
            onChange={(e) => onUpdateProvider(currentProviderId, { apiKey: e.target.value })}
            placeholder={t.aiApiKeyPlaceholder}
            className="w-full h-12 rounded-lg border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 px-4 pr-12 focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10"
          />
          <button
            type="button"
            aria-label={settings.language === 'zh' ? (showKey ? '隐藏 API Key' : '显示 API Key') : (showKey ? 'Hide API key' : 'Show API key')}
            aria-pressed={showKey}
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
          aria-label={t.aiEndpoint}
          value={currentProvider.baseUrl || ENDPOINT_PLACEHOLDERS[currentProviderId]}
          onChange={(e) => onUpdateProvider(currentProviderId, { baseUrl: e.target.value })}
          className="w-full h-12 rounded-lg border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 px-4 focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10"
        />
      </div>

      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">{t.aiModel}</Label>
          <Button type="button" variant="outline" size="sm" className="min-h-11 shrink-0 gap-2 rounded-lg"
            disabled={catalog.loading} onClick={() => { void catalog.refresh(); }}>
            <RefreshCw size={14} aria-hidden="true" />{zh ? '刷新模型' : 'Refresh models'}
          </Button>
        </div>
        <Select
          items={[...modelOptions.map(model => ({ value: model, label: model })), { value: CUSTOM_MODEL_VALUE, label: t.aiModelCustomOption }]}
          value={selectedModelValue}
          onValueChange={handleModelChange}
          onOpenChange={open => { if (open) setModelMenu(availableModels); }}
          onOpenChangeComplete={open => { if (!open) setModelMenu(null); }}
        >
          <SelectTrigger aria-label={t.aiModel} className="w-full h-12 rounded-lg border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 focus:ring-1 focus:ring-[var(--app-accent)]/35">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-[var(--app-border)] bg-[var(--app-surface)]">
            {modelOptions.map(m => (
              <SelectItem key={m} value={m} title={m}>{m}</SelectItem>
            ))}
            <SelectItem value={CUSTOM_MODEL_VALUE} className="rounded-lg">
              {t.aiModelCustomOption}
            </SelectItem>
          </SelectContent>
        </Select>
        {catalogStatus && <p role="status" className="text-xs leading-relaxed text-muted-foreground">{catalogStatus}</p>}
        {catalog.models && currentProvider.model && !catalog.models.includes(currentProvider.model) && <p className="text-xs leading-relaxed text-muted-foreground">
          {zh ? '当前模型未出现在最新列表中，已保留。可选择新模型或测试连接。' : 'Current model is not in the latest list and has been kept. Choose another model or test the connection.'}
        </p>}
        {isCustomModel ? (
          <Input
            aria-label={t.aiModelCustomPlaceholder}
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
