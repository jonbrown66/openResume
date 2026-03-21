import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, PenLine } from 'lucide-react';
import type { AppSettings } from '@/config/settings';
import { translations } from '@/config/ui';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AppearanceSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
}

export function AppearanceSettings({ settings, onUpdateSettings }: AppearanceSettingsProps) {
  const t = translations[settings.language];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="space-y-4">
        <Label className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
          {t.appearanceTheme}
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', name: t.themeLight, icon: <Sun className="w-5 h-5" /> },
            { id: 'dark', name: t.themeDark, icon: <Moon className="w-5 h-5" /> },
            { id: 'system', name: t.themeAuto, icon: <Monitor className="w-5 h-5" /> }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => onUpdateSettings({ theme: mode.id as 'light' | 'dark' | 'system' })}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all duration-200",
                settings.theme === mode.id
                  ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]"
                  : "bg-zinc-50/50 dark:bg-zinc-900/30 border-transparent hover:border-zinc-200 dark:hover:border-zinc-800/80"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                settings.theme === mode.id ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"
              )}>
                {mode.icon}
              </div>
              <span className={cn(
                "text-sm font-medium",
                settings.theme === mode.id ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
              )}>
                {mode.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
          {t.appearanceLanguage}
        </Label>
        <Select 
          value={settings.language} 
          onValueChange={(val) => onUpdateSettings({ language: val as 'zh' | 'en' })}
        >
          <SelectTrigger className="w-full h-12 rounded-lg border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 px-4 focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <SelectItem value="zh" className="rounded-lg">{t.languageZh}</SelectItem>
            <SelectItem value="en" className="rounded-lg">{t.languageEn}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </motion.div>
  );
}
