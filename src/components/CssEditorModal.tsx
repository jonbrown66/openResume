import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Copy, Check, Save, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { translations } from '@/config/ui';
import { FONT_STYLES } from '@/constants';
import type { ResumeTemplate } from '@/config/ui';

interface CssEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  customCss: string;
  onSave: (css: string) => void;
  onReset: () => void;
  lang: 'en' | 'zh';
  template: ResumeTemplate;
  currentFont: string;
}

const BASE_CSS = `/* 基础样式 */
.resume-content {
  font-family: var(--font-family);
  font-size: var(--font-size);
  line-height: var(--line-height);
}
.resume-content h2 {
  font-size: 1rem;
  font-weight: 800;
  color: var(--primary-color);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 0.5rem;
  margin: 16px 0 8px;
}
.resume-content h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--secondary-color);
  margin-top: 12px;
}
.resume-h3-split {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
}
.resume-h3-split h3 {
  margin-top: 0;
}
.resume-h3-split span {
  font-size: 0.875rem;
  color: #4B5563;
}
.resume-content p {
  color: #374151;
  margin-bottom: 4px;
}
.resume-content p strong {
  color: var(--secondary-color);
}
.resume-list {
  list-style: disc;
  padding-left: 1.25rem;
  margin-bottom: 8px;
}
.resume-list li {
  color: #374151;
}
.skills-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  list-style: disc;
  padding-left: 1.25rem;
  margin-bottom: 8px;
}
.skills-list li {
  color: #374151;
}`;

const TEMPLATE_CSS: Record<ResumeTemplate, string> = {
  classic: `${BASE_CSS}

/* Classic 头部 */
.bg-\\[\\#EAEAEA\\] {
  background: #EAEAEA;
  padding: 24px;
}`,
  minimal: `${BASE_CSS}

/* Minimal 模板 */
.template-minimal .resume-content h2 {
  font-family: var(--font-serif);
  text-align: center;
  border-bottom: 1px solid;
  letter-spacing: 0.2em;
  font-weight: 600;
}
.template-minimal .resume-content h3 {
  font-family: var(--font-serif);
}`,
  standard: `${BASE_CSS}

/* Standard 模板 */
.template-standard .resume-content h2 {
  border-bottom: none;
}
.template-standard .resume-h3-split span {
  color: var(--secondary-color);
}`,
  sidebar: `${BASE_CSS}

/* Sidebar 模板 */
.template-sidebar .sidebar-section {
  display: flex;
  margin-bottom: 16px;
}
.template-sidebar .sidebar-title {
  width: 25%;
  border-right: 1px solid var(--primary-color);
  padding-right: 12px;
}
.template-sidebar .sidebar-content {
  width: 75%;
  padding-left: 12px;
}`,
};

function getBaseCss(fontFamily: string): string {
  return `/* 基础样式 */
.resume-content {
  font-family: '${fontFamily}', sans-serif;
  font-size: var(--font-size);
  line-height: var(--line-height);
}
.resume-content h2 {
  font-size: 1rem;
  font-weight: 800;
  color: var(--primary-color);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 0.5rem;
  margin: 16px 0 8px;
}
.resume-content h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--secondary-color);
  margin-top: 12px;
}
.resume-h3-split {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
}
.resume-h3-split h3 {
  margin-top: 0;
}
.resume-h3-split span {
  font-size: 0.875rem;
  color: #4B5563;
}
.resume-content p {
  color: #374151;
  margin-bottom: 4px;
}
.resume-content p strong {
  color: var(--secondary-color);
}
.resume-list {
  list-style: disc;
  padding-left: 1.25rem;
  margin-bottom: 8px;
}
.resume-list li {
  color: #374151;
}
.skills-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  list-style: disc;
  padding-left: 1.25rem;
  margin-bottom: 8px;
}
.skills-list li {
  color: #374151;
}`;
}

function getTemplateCss(template: ResumeTemplate, fontFamily: string): string {
  const base = getBaseCss(fontFamily);
  switch (template) {
    case 'classic':
      return `${base}

/* Classic 头部 */
.bg-\\[\\#EAEAEA\\] {
  background: #EAEAEA;
  padding: 24px;
}`;
    case 'minimal':
      return `${base}

/* Minimal 模板 */
.template-minimal .resume-content h2 {
  font-family: var(--font-serif);
  text-align: center;
  border-bottom: 1px solid;
  letter-spacing: 0.2em;
  font-weight: 600;
}
.template-minimal .resume-content h3 {
  font-family: var(--font-serif);
}`;
    case 'standard':
      return `${base}

/* Standard 模板 */
.template-standard .resume-content h2 {
  border-bottom: none;
}
.template-standard .resume-h3-split span {
  color: var(--secondary-color);
}`;
    case 'sidebar':
      return `${base}

/* Sidebar 模板 */
.template-sidebar .sidebar-section {
  display: flex;
  margin-bottom: 16px;
}
.template-sidebar .sidebar-title {
  width: 25%;
  border-right: 1px solid var(--primary-color);
  padding-right: 12px;
}
.template-sidebar .sidebar-title h2 {
  font-size: 0.875rem;
  border: none;
  margin: 0;
  padding: 0;
}
.template-sidebar .sidebar-content {
  width: 75%;
  padding-left: 12px;
}`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightCss(code: string): string {
  const escaped = escapeHtml(code);
  return escaped
    .replace(/\/\*([\s\S]*?)\*\//g, '<span class="css-comment">/*$1*/</span>')
    .replace(/([.#]?[\w-]+)(\s*\{)/g, '<span class="css-selector">$1</span>$2')
    .replace(/([\w-]+)(\s*:\s*)([^;{}\n]+)(;?)/g, '<span class="css-property">$1</span>$2<span class="css-value">$3</span>$4')
    .replace(/(\{|\})/g, '<span class="css-brace">$1</span>');
}

export function CssEditorModal({
  isOpen,
  onClose,
  customCss,
  onSave,
  onReset,
  lang,
  template,
  currentFont,
}: CssEditorModalProps) {
  const [css, setCss] = useState('');
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  const handleSave = useCallback(() => {
    onSave(css);
    onClose();
  }, [css, onSave, onClose]);

  const handleReset = useCallback(() => {
    const defaultCss = getTemplateCss(template, currentFont);
    setCss(defaultCss);
    onReset();
  }, [onReset, template, currentFont]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [css]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCss(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = css.substring(0, start) + '  ' + css.substring(end);
      setCss(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [css, onClose, handleSave]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const pre = textarea.previousElementSibling as HTMLPreElement;
    if (pre) {
      pre.scrollTop = textarea.scrollTop;
      pre.scrollLeft = textarea.scrollLeft;
    }
  }, []);

  useEffect(() => {
    setCss(customCss || getTemplateCss(template, currentFont));
  }, [customCss, isOpen, template, currentFont]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative w-full max-w-2xl max-h-[85vh] flex flex-col",
              "bg-white dark:bg-zinc-900",
              "rounded-2xl shadow-2xl",
              "border border-zinc-200 dark:border-zinc-700",
              "overflow-hidden"
            )}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                  <Code2 className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {t.customCss}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t.customizeStyles}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 px-6 py-4 min-h-0" ref={containerRef}>
              <div className="relative rounded-xl border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-[#0d1117] overflow-hidden">
                <pre 
                  className="absolute inset-0 p-4 text-[13px] leading-6 font-mono whitespace-pre-wrap overflow-auto pointer-events-none text-zinc-900 dark:text-zinc-100"
                  dangerouslySetInnerHTML={{ __html: highlightCss(css) }}
                />
                <textarea
                  value={css}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  onScroll={handleScroll}
                  spellCheck={false}
                  className="block w-full h-[400px] p-4 resize-none text-[13px] leading-6 font-mono bg-transparent text-transparent caret-zinc-900 dark:caret-zinc-100 border-0 focus:outline-none whitespace-pre-wrap overflow-auto"
                />
              </div>
              
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  {lang === 'zh' ? '⌘/Ctrl + S 保存 | Tab 缩进' : '⌘/Ctrl + S to save | Tab to indent'}
                </span>
                <span>{css.length} chars</span>
              </div>
            </div>

            <style>{`
              .css-comment { color: #6a737d; }
              .css-selector { color: #22863a; }
              .css-property { color: #d73a49; }
              .css-value { color: #005cc5; }
              .css-brace { color: #24292e; }
              .dark .css-comment { color: #8b949e; }
              .dark .css-selector { color: #7ee787; }
              .dark .css-property { color: #ff7b72; }
              .dark .css-value { color: #a5d6ff; }
              .dark .css-brace { color: #c9d1d9; }
            `}</style>

            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
              <button
                onClick={handleReset}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium",
                  "text-zinc-600 dark:text-zinc-400",
                  "hover:bg-zinc-100 dark:hover:bg-zinc-700",
                  "transition-colors"
                )}
              >
                <RotateCcw className="w-4 h-4" />
                {t.resetToDefault}
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium",
                    "text-zinc-600 dark:text-zinc-400",
                    "hover:bg-zinc-100 dark:hover:bg-zinc-700",
                    "transition-colors"
                  )}
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? t.copied : t.copy}
                </button>
                
                <button
                  onClick={handleSave}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold",
                    "bg-zinc-900 dark:bg-zinc-100",
                    "text-white dark:text-zinc-900",
                    "hover:bg-zinc-800 dark:hover:bg-zinc-200",
                    "transition-colors"
                  )}
                >
                  <Save className="w-4 h-4" />
                  {t.save}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
