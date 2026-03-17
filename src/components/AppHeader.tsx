import type { ChangeEvent, RefObject } from 'react';

import { Languages, Loader2, Moon, Printer, Settings, Sun, Upload } from 'lucide-react';

import type { AppLanguage, AppTheme, TranslationSet } from '../config/ui';
import type { AppSettings, ApiProviderId } from '../config/settings';
import { SettingsModal } from './SettingsModal';
import { useState } from 'react';


interface AppHeaderProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  isExporting: boolean;
  isImporting: boolean;
  lang: AppLanguage;
  theme: AppTheme;
  translations: TranslationSet;
  onExport: () => void;
  onImportClick: () => void;
  onLanguageToggle: () => void;
  onThemeToggle: () => void;
  settings: AppSettings;
  onUpdateProvider: (id: ApiProviderId, updates: any) => void;
  onSetActiveProvider: (id: ApiProviderId) => void;
}

export function AppHeader({
  fileInputRef,
  onFileChange,
  isExporting,
  isImporting,
  lang,
  theme,
  translations: t,
  onExport,
  onImportClick,
  onLanguageToggle,
  onThemeToggle,
  settings,
  onUpdateProvider,
  onSetActiveProvider,
}: AppHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shrink-0 z-20 transition-all duration-300 print:hidden">
      <div className="flex items-center gap-1 sm:gap-3">
        <div className="hidden sm:flex items-center gap-2 mr-2">
          <div className="w-3 h-3 rounded-full bg-red-400 dark:bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-amber-400 dark:bg-amber-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-400 dark:bg-green-500"></div>
        </div>
        <span className="text-[10px] sm:text-sm font-bold sm:font-medium text-gray-500 dark:text-gray-400 tracking-wider sm:tracking-wide uppercase truncate max-w-[80px] sm:max-w-none">{t.editor}</span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={onThemeToggle}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button
          onClick={onLanguageToggle}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors flex items-center justify-center"
          title="Toggle Language"
        >
          <Languages size={16} />
          <span className="ml-1 text-[10px] font-bold uppercase">{lang === 'en' ? '中' : 'EN'}</span>
        </button>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          title="API Settings"
        >
          <Settings size={16} />
        </button>
        <div className="hidden sm:block w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2"></div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          accept=".txt,.md,.pdf,.docx"
          className="hidden"
        />

        <button
          onClick={onImportClick}
          disabled={isImporting}
          className="hidden sm:flex px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full text-xs transition-all font-medium items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {isImporting ? t.importing : t.import}
        </button>
        <button
          onClick={onImportClick}
          disabled={isImporting}
          className="sm:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-indigo-600 dark:text-indigo-400 transition-colors flex items-center justify-center disabled:opacity-50"
        >
          {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        </button>

        <button
          onClick={onExport}
          disabled={isExporting}
          className="hidden sm:flex px-4 py-2 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-gray-900 rounded-full text-xs transition-all font-medium shadow-sm hover:shadow-md items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
          {isExporting ? t.exporting : t.export}
        </button>
        <button
          onClick={onExport}
          disabled={isExporting}
          className="sm:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-center disabled:opacity-50"
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
        </button>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateProvider={onUpdateProvider}
        onSetActiveProvider={onSetActiveProvider}
      />
    </div>
  );
}
