import { Eye, EyeOff, Save, X, Settings2, Globe, Cpu } from 'lucide-react';
import { useState } from 'react';
import type { AppSettings, ApiProviderId } from '../config/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateProvider: (id: ApiProviderId, updates: any) => void;
  onSetActiveProvider: (id: ApiProviderId) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateProvider,
  onSetActiveProvider,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<ApiProviderId>(settings.activeProvider);
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  const currentProvider = settings.providers[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">模型配置</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800/50 m-4 rounded-xl">
          {(Object.keys(settings.providers) as ApiProviderId[]).map((pid) => (
            <button
              key={pid}
              onClick={() => setActiveTab(pid)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === pid
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {settings.providers[pid].name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-5">
          {/* Active Status */}
          <div 
            onClick={() => onSetActiveProvider(activeTab)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
              settings.activeProvider === activeTab 
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10' 
                : 'border-gray-100 dark:border-gray-800 bg-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${settings.activeProvider === activeTab ? 'bg-indigo-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm font-semibold dark:text-gray-200">
                {settings.activeProvider === activeTab ? '当前正在使用' : '点击切换为当前'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">API Key</label>
              <div className="relative group">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={currentProvider.apiKey}
                  onChange={(e) => onUpdateProvider(activeTab, { apiKey: e.target.value })}
                  placeholder={`输入 ${currentProvider.name} API Key`}
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dark:text-white placeholder:text-gray-400"
                />
                <button 
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">模型选择</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Cpu size={16} />
                </div>
                <select
                  value={currentProvider.model}
                  onChange={(e) => onUpdateProvider(activeTab, { model: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white appearance-none"
                >
                  {activeTab === 'openai' ? (
                    <>
                      <option value="gpt-5.3">gpt-5.3 (Future)</option>
                      <option value="gpt-4o">gpt-4o</option>
                      <option value="gpt-4o-mini">gpt-4o-mini</option>
                    </>
                  ) : (
                    <>
                      <option value="gemini-3.0-flash">gemini-3.0-flash</option>
                      <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Base URL (Optional) */}
            {activeTab === 'openai' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">API 代理 (可选)</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Globe size={16} />
                  </div>
                  <input
                    type="text"
                    value={currentProvider.baseUrl}
                    onChange={(e) => onUpdateProvider(activeTab, { baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Save size={18} />
            完成配置
          </button>
        </div>
      </div>
    </div>
  );
}
