import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Ruler, AlignVerticalSpaceAround } from 'lucide-react';
import type { ResumeThemeConfig } from '@/types/theme';
import { translations } from '@/config/ui';
import { AnchoredPanel } from './ui/AnchoredPanel';
import { BUILTIN_FONTS, LOCAL_FONTS, checkLocalFont, ensureResumeFonts, fontLabel, resolveFont } from '@/lib/resumeFonts';
import { ColorPicker } from './ColorPicker';
import { SliderControl } from './SliderControl';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectGroup,
  SelectLabel,
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
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [loadingFont, setLoadingFont] = useState<string | null>(null);
  const [fontError, setFontError] = useState(false);
  const installedFonts = LOCAL_FONTS.filter(font => available[font]);
  const request = useRef(0);
  useEffect(() => {
    let active = true;
    Promise.all(LOCAL_FONTS.map(async font => [font, await checkLocalFont(font)] as const)).then(entries => {
      if (active) setAvailable(Object.fromEntries(entries));
    });
    return () => { active = false; request.current++; };
  }, []);
  async function selectFont(value: string | null) {
    if (!value) return;
    const token = ++request.current;
    setLoadingFont(value); setFontError(false);
    try {
      const text = document.querySelector('.resume-measure')?.textContent ?? '简历 Resume';
      await ensureResumeFonts(value, text);
      if (token === request.current) onChange({ fontFamily: value });
    } catch { if (token === request.current) setFontError(true); }
    finally { if (token === request.current) setLoadingFont(null); }
  }

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
    <AnchoredPanel compactPanel title={t.styleEditor} closeLabel={t.close} triggerRef={triggerRef} anchorRect={anchorRect} onClose={onClose}
      footer={<button type="button" onClick={() => { request.current++; setLoadingFont(null); setFontError(false); onReset(); }} className="app-secondary flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border text-xs font-medium transition-colors">
        <RotateCcw size={16} />{t.resetToDefault}
      </button>}>
      <motion.div 
        className="ui-style-form"
      >
        <motion.div>
          <div className="ui-style-colors">
            <ColorPicker
              label={t.primaryColor}
              value={theme.primaryColor}
              presets={PRESET_COLORS}
              onChange={(v) => onChange({ primaryColor: v })}
            />
            <ColorPicker
              label={t.backgroundColor}
              value={theme.backgroundColor}
              presets={['#ffffff', '#faf9f3', '#fff7ed', '#f0fdf4', '#eff6ff', '#faf5ff']}
              onChange={(v) => onChange({ backgroundColor: v })}
            />
          </div>
        </motion.div>

        <motion.div className="ui-style-font">
          <span className="ui-label">{t.typography}</span>
          <Select
            value={resolveFont(theme.fontFamily)}
            onValueChange={selectFont}
          >
            <SelectTrigger aria-label={t.typography} className="w-full h-10 rounded-xl border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 focus:ring-1 focus:ring-[var(--app-accent)]/35">
              <SelectValue>{fontLabel(theme.fontFamily, lang)}</SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-lg border-[var(--app-border)] bg-[var(--app-surface)]">
              <SelectGroup>
                <SelectLabel>{lang === 'zh' ? '内置字体 · 可嵌入导出' : 'Built-in · export ready'}</SelectLabel>
                {BUILTIN_FONTS.map(font => <SelectItem key={font} value={font} title={fontLabel(font, lang)}>{fontLabel(font, lang)}</SelectItem>)}
              </SelectGroup>
              {installedFonts.length > 0 && <SelectGroup>
                <SelectLabel>{lang === 'zh' ? '已安装的本地字体' : 'Installed local fonts'}</SelectLabel>
                {installedFonts.map(font => <SelectItem key={font} value={font} title={font}>
                  {font}
                </SelectItem>)}
              </SelectGroup>}
            </SelectContent>
          </Select>
          {(loadingFont || fontError) && <p role="status" className="mbs-2 text-xs leading-relaxed text-muted-foreground">
            {loadingFont ? (lang === 'zh' ? `正在加载 ${fontLabel(loadingFont, lang)}，完成后应用…` : `Loading ${fontLabel(loadingFont, lang)}…`)
              : (lang === 'zh' ? '字体加载失败，已保留当前字体。请重新选择以重试。' : 'Font loading failed. Current font kept; select again to retry.')}
          </p>}
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
            description={lang === 'zh' ? '正文会保留字体所需的最小行距，避免文字重叠和分页裁字。' : 'Body text keeps the font’s minimum safe line height to prevent overlap and clipped page breaks.'}
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
