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
                  ? "bg-[var(--app-accent-soft)] border-[var(--app-accent)] shadow-[0_2px_10px_-4px_rgba(84,112,45,0.28)]"
                  : "bg-[var(--app-surface-muted)] border-transparent hover:border-[var(--app-border)]"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                settings.theme === mode.id ? "text-[var(--secondary-foreground)]" : "text-[var(--muted-foreground)]"
              )}>
                {mode.icon}
              </div>
              <span className={cn(
                "text-sm font-medium",
                settings.theme === mode.id ? "text-[var(--secondary-foreground)]" : "text-[var(--muted-foreground)]"
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
          <SelectTrigger className="w-full h-12 rounded-lg border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 focus:ring-1 focus:ring-[var(--app-accent)]/35">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-[var(--app-border)] bg-[var(--app-surface)]">
            <SelectItem value="zh" className="rounded-lg">{t.languageZh}</SelectItem>
            <SelectItem value="en" className="rounded-lg">{t.languageEn}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </motion.div>
  );
}
