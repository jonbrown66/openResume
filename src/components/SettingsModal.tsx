import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, Cpu, Palette, PenLine, X } from 'lucide-react';
import type { AppSettings, ApiProviderId } from '@/config/settings';
import { translations } from '@/config/ui';
import { 
  Dialog, 
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiSettings, AppearanceSettings } from '@/components/settings';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  lang: 'en' | 'zh';
  onUpdateProvider: (id: ApiProviderId, updates: Partial<AppSettings['providers'][keyof AppSettings['providers']]>) => void;
  onSetActiveProvider: (id: ApiProviderId) => void;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  lang,
  onUpdateProvider,
  onSetActiveProvider,
  onUpdateSettings,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState("ai");
  const t = translations[lang];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        showCloseButton={false}
        className={cn(
          "sm:max-w-[600px] p-0 gap-0 overflow-hidden",
          "bg-white/90 dark:bg-zinc-950/90 backdrop-blur-3xl",
          "border border-zinc-200/80 dark:border-zinc-800/80",
          "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)]",
          "flex flex-col max-h-[90vh] w-full max-w-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 outline-none",
        )}
      >
        <div className="px-8 pt-8 pb-4 relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings2 className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
            <DialogTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 italic">
              {t.settingsTitle}
            </DialogTitle>
          </div>
          <DialogClose className="p-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400">
            <X className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-8 flex flex-col h-full">
          <TabsList className="w-full h-12 bg-zinc-100/50 dark:bg-zinc-900/50 p-1 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50 gap-1 mb-6">
            <TabsTrigger 
              value="ai" 
              className={cn(
                "flex-1 h-full rounded-xl gap-2 text-sm font-medium transition-all duration-200",
                "data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm data-[state=active]:border-zinc-200 dark:data-[state=active]:border-zinc-700"
              )}
            >
              <Cpu className="w-4 h-4" />
              {t.tabAi}
            </TabsTrigger>
            <TabsTrigger 
              value="appearance" 
              className={cn(
                "flex-1 h-full rounded-xl gap-2 text-sm font-medium transition-all duration-200",
                "data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm data-[state=active]:border-zinc-200 dark:data-[state=active]:border-zinc-700"
              )}
            >
              <Palette className="w-4 h-4" />
              {t.tabAppearance}
            </TabsTrigger>
            <TabsTrigger 
              value="editor" 
              className={cn(
                "flex-1 h-full rounded-xl gap-2 text-sm font-medium transition-all duration-200",
                "data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm data-[state=active]:border-zinc-200 dark:data-[state=active]:border-zinc-700"
              )}
            >
              <PenLine className="w-4 h-4" />
              {t.tabEditor}
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent key="ai" value="ai" className="focus-visible:outline-none min-h-[400px]">
              <AiSettings
                settings={settings}
                onUpdateProvider={onUpdateProvider}
                onSetActiveProvider={onSetActiveProvider}
              />
            </TabsContent>

            <TabsContent key="appearance" value="appearance" className="focus-visible:outline-none min-h-[400px]">
              <AppearanceSettings
                settings={settings}
                onUpdateSettings={onUpdateSettings}
              />
            </TabsContent>

            <TabsContent key="editor" value="editor" className="focus-visible:outline-none min-h-[400px]">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center h-[300px] text-zinc-400"
              >
                <PenLine className="w-12 h-12 mb-4 opacity-20" />
                <p>{t.tabEditor} - {lang === 'zh' ? '暂不可用' : 'Coming soon'}</p>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
        
        <div className="pb-8" />
      </DialogContent>
    </Dialog>
  );
}
