import { Settings2, X } from 'lucide-react';
import type { AppSettings, ApiProviderId } from '@/config/settings';
import { translations } from '@/config/ui';
import { 
  Dialog, 
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { AiSettings } from '@/components/settings';
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
}: SettingsModalProps) {
  const t = translations[lang];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        showCloseButton={false}
        className={cn(
          "sm:max-w-[600px] p-0 gap-0 overflow-hidden",
          "app-panel",
          "flex flex-col max-h-[90vh] w-full max-w-2xl rounded-2xl border overflow-hidden outline-none",
        )}
      >
        <div className="px-8 pt-8 pb-4 relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings2 className="w-6 h-6 text-[var(--secondary-foreground)]" />
            <DialogTitle className="text-2xl font-bold text-[var(--foreground)] italic">
              {t.settingsTitle}
            </DialogTitle>
          </div>
          <DialogClose className="app-control p-2.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]">
            <X className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <div className="px-8 min-h-[400px]">
          <AiSettings
            settings={settings}
            onUpdateProvider={onUpdateProvider}
            onSetActiveProvider={onSetActiveProvider}
          />
        </div>
        
        <div className="pb-8" />
      </DialogContent>
    </Dialog>
  );
}
