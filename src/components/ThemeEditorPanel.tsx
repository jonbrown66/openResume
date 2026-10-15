import { memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Type, Ruler, AlignVerticalSpaceAround } from 'lucide-react';
import type { ResumeThemeConfig } from '@/types/theme';
import { translations } from '@/config/ui';
import { AnchoredPanel } from './ui/AnchoredPanel';
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

export interface ThemeEditorPanelProps {
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

  useEffect(() => {
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target;
      const targetNode = target instanceof Node ? target : null;
      const targetElement = target instanceof Element ? target : null;
      const trigger = triggerRef.current;
      const isSelectPortal = Boolean(
        targetElement?.closest('[data-radix-portal], [data-slot="select-content"]'),
      );
      
      if (!targetElement?.closest('[data-overlay-portal]') && !trigger?.contains(targetNode) && !isSelectPortal) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [triggerRef, onClose]);

  if (typeof window === 'undefined' || !anchorRect) return null;

  return (
    <AnchoredPanel title={t.styleEditor} closeLabel={t.close} triggerRef={triggerRef} anchorRect={anchorRect} onClose={onClose}
      footer={<button type="button" onClick={onReset} className="app-secondary flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors">
        <RotateCcw size={16} />{t.resetToDefault}
      </button>}>
      <motion.div 
        className="ui-style-form"
      >
        <motion.div>
          <div className="space-y-3">
            <ColorPicker
              label={t.primaryColor}
              value={theme.primaryColor}
              presets={PRESET_COLORS}
              onChange={(v) => onChange({ primaryColor: v })}
            />
          </div>
        </motion.div>

        <motion.div>
          <div className="flex items-center gap-2 mb-3">
            <Type size={12} className="text-zinc-400" />
            <span className="ui-label">
              {t.typography}
            </span>
          </div>
          <Select
            value={theme.fontFamily}
            onValueChange={(val) => onChange({ fontFamily: val || undefined })}
          >
            <SelectTrigger aria-label={t.typography} className="w-full h-10 rounded-xl border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 focus:ring-1 focus:ring-[var(--app-accent)]/35">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-[var(--app-border)] bg-[var(--app-surface)]">
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font} value={font} title={font}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div className="ui-style-sliders">
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

    </AnchoredPanel>
  );
});
