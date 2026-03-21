import { AnimatePresence, motion } from 'framer-motion';

interface ImportNoticeBannerProps {
  message: string;
}

export function ImportNoticeBanner({ message }: ImportNoticeBannerProps) {
  return (
    <AnimatePresence mode="wait">
      {message ? (
        <motion.div
          className="px-4 sm:px-6 py-2 sm:py-3 border-b border-amber-200/50 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 text-[11px] sm:text-sm transition-colors duration-200 print:hidden"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
