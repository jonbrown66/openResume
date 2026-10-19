import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ImportNoticeBanner } from '@/components/ImportNoticeBanner';
import { MobileViewToggle } from '@/components/MobileViewToggle';
import type { ActiveView, AppLanguage, TranslationSet } from '@/config/ui';
import { slideUpVariants } from '@/lib/motion';

interface WorkspaceShellProps {
  lang: AppLanguage;
  translations: TranslationSet;
  noticeMessage: string;
  activeView: ActiveView;
  onActiveViewChange: (view: ActiveView) => void;
  header: ReactNode;
  editor: ReactNode;
  preview: ReactNode;
  assistant: ReactNode;
}

export function WorkspaceShell({ lang, translations, noticeMessage, activeView, onActiveViewChange,
  header, editor, preview, assistant }: WorkspaceShellProps) {
  return <>
    <main className="app-ui flex h-dvh w-full items-center justify-center overflow-hidden bg-[var(--app-bg)] font-sans transition-colors duration-200 sm:p-4 md:p-8">
      <motion.div className="app-shell flex h-full w-full max-w-[1600px] flex-col overflow-hidden border transition-colors duration-200 sm:rounded-xl"
        initial="hidden" animate="visible" variants={slideUpVariants}>
        <ErrorBoundary lang={lang}>{header}</ErrorBoundary>
        <ImportNoticeBanner message={noticeMessage} />
        <div className="relative flex flex-1 overflow-hidden bg-[var(--app-bg)]">
          <div className={`${activeView === 'editor' ? 'flex' : 'hidden'} w-full lg:flex lg:w-[44%] xl:w-[41%] 2xl:w-[39%]`}>
            <ErrorBoundary lang={lang}>{editor}</ErrorBoundary>
          </div>
          <div className={`${activeView === 'preview' ? 'flex' : 'hidden'} w-full lg:flex lg:min-w-0 lg:flex-1`}>
            <ErrorBoundary lang={lang}>{preview}</ErrorBoundary>
          </div>
        </div>
        <MobileViewToggle activeView={activeView} translations={translations} onChange={onActiveViewChange} />
      </motion.div>
    </main>
    <ErrorBoundary lang={lang}>{assistant}</ErrorBoundary>
  </>;
}
