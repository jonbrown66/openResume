import { memo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal, RotateCcw, Type, Palette, Ruler, AlignVerticalSpaceAround } from 'lucide-react';
import type { ResumeThemeConfig } from '@/types/theme';
import { translations } from '@/config/ui';
import { cn } from '@/lib/utils';
import { springTransition, staggerItem, staggerContainer } from '@/lib/motion';
import { FONT_OPTIONS } from '@/constants';
import { ColorPicker } from './ColorPicker';
import { SliderControl } from './SliderControl';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface ThemeEditorPanelProps {
  triggerRef: React.RefObject<HTMLElement | null>;
  anchorRect: DOMRect | null;
  theme: ResumeThemeConfig;
  lang: 'en' | 'zh';
  onChange: (newConfig: Partial<ResumeThemeConfig>) => void;
  onReset: () => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#1b1f16', '#26311d', '#56693f', '#687060',
  '#a9d56b', '#9ac95b', '#7faf43', '#eef3e7',
  '#31572c', '#4f772d', '#90a955', '#cfe8a9',
  '#8a5a44', '#b07d62', '#d6a77a', '#f0d8b8',
];

export const ThemeEditorPanel = memo(function ThemeEditorPanel({
  triggerRef,
  anchorRect,
  theme,
  lang,
  onChange,
  onReset,
  onClose,
}: ThemeEditorPanelProps) {
  const t = translations[lang];
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const panel = panelRef.current;
      const trigger = triggerRef.current;
      const select = target.closest('[data-radix-portal]');
      
      if (!panel?.contains(target) && !trigger?.contains(target) && !select) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [triggerRef, onClose]);

  if (typeof window === 'undefined' || !anchorRect) return null;

  const panelWidth = 320;
  const left = Math.max(12, Math.min(
    anchorRect.right - panelWidth,
    window.innerWidth - panelWidth - 16
  ));
  const top = anchorRect.bottom + 8;

  return createPortal(
    <motion.div
      ref={panelRef}
      id="theme-editor-panel"
      role="dialog"
      aria-label={t.styleEditor}
      initial={{ opacity: 0, scale: 0.96, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -8 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{ top, left }}
      className={cn(
        "fixed z-50 w-[min(320px,calc(100vw-24px))]",
        "app-panel",
        "border",
        "rounded-xl",
        "overflow-hidden"
      )}
    >
      <motion.div 
        className="flex justify-between items-center p-5"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="flex items-center gap-3"
          variants={staggerItem}
        >
          <motion.div 
            className="rounded-xl bg-[var(--app-accent-soft)] p-2.5"
            whileHover={{ rotate: 15 }}
            transition={springTransition}
          >
            <SlidersHorizontal size={18} className="text-[var(--secondary-foreground)]" strokeWidth={1.8} />
          </motion.div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {t.styleEditor}
          </h2>
        </motion.div>
        <motion.button
          onClick={onClose}
          variants={staggerItem}
          className="app-control rounded-xl p-2 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </motion.button>
      </motion.div>

      <motion.div 
        className="px-5 pb-5 space-y-5 overflow-y-auto max-h-[calc(100vh-200px)]"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem}>
          <div className="flex items-center gap-2 mb-3">
            <Palette size={12} className="text-zinc-400" />
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              {t.colors}
            </span>
          </div>
          <div className="space-y-3">
            <ColorPicker
              label={t.primaryColor}
              value={theme.primaryColor}
              presets={PRESET_COLORS.slice(0, 8)}
              onChange={(v) => onChange({ primaryColor: v })}
            />
            <ColorPicker
              label={t.secondaryColor}
              value={theme.secondaryColor}
              presets={PRESET_COLORS.slice(8)}
              onChange={(v) => onChange({ secondaryColor: v })}
            />
          </div>
        </motion.div>

        <motion.div variants={staggerItem}>
          <div className="flex items-center gap-2 mb-3">
            <Type size={12} className="text-zinc-400" />
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              {t.typography}
            </span>
          </div>
          <Select
            value={theme.fontFamily}
            onValueChange={(val) => onChange({ fontFamily: val || undefined })}
          >
            <SelectTrigger className="w-full h-10 rounded-xl border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 focus:ring-1 focus:ring-[var(--app-accent)]/35">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-[var(--app-border)] bg-[var(--app-surface)]">
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font} value={font} className="rounded-lg">
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div variants={staggerItem} className="space-y-3 pt-2 border-t border-[var(--app-border)]">
          <SliderControl
            label={t.fontSize}
            unit="pt"
            value={theme.fontSize}
            min={8}
            max={16}
            step={0.5}
            icon={<span className="text-xs font-mono">Aa</span>}
            onChange={(v: number) => onChange({ fontSize: v })}
          />

          <SliderControl
            label={t.lineHeight}
            unit=""
            value={theme.lineHeight}
            min={1.0}
            max={2.0}
            step={0.05}
            icon={<Ruler size={14} className="text-zinc-400" />}
            onChange={(v: number) => onChange({ lineHeight: v })}
          />

          <SliderControl
            label={t.sectionSpacing}
            unit="px"
            value={theme.sectionSpacing}
            min={8}
            max={48}
            step={1}
            icon={<AlignVerticalSpaceAround size={14} className="text-zinc-400" />}
            onChange={(v: number) => onChange({ sectionSpacing: v })}
          />

          <SliderControl
            label={t.pageMargin}
            unit="mm"
            value={theme.pageMargin}
            min={10}
            max={30}
            step={1}
            icon={<Ruler size={14} className="text-zinc-400" />}
            onChange={(v: number) => onChange({ pageMargin: v })}
          />
        </motion.div>
      </motion.div>

      <motion.div 
        className="p-4 border-t border-[var(--app-border)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <motion.button
          onClick={onReset}
          className="app-secondary flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors active:scale-[0.98]"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <RotateCcw size={14} />
          {t.resetToDefault}
        </motion.button>
      </motion.div>
    </motion.div>,
    document.body
  );
});
