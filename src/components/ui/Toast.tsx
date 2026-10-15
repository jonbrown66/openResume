import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { uiTransition } from '@/lib/motion';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const TOAST_DURATION = 4000;
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children, language = 'en' }: { children: ReactNode; language?: 'zh' | 'en' }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type, createdAt: Date.now() }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} closeLabel={language === 'zh' ? '关闭通知' : 'Dismiss notification'} />
    </ToastContext.Provider>
  );
}

const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
};

const TOAST_ACCENT = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
};

const TOAST_ICON_COLORS = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
  warning: 'text-amber-600 dark:text-amber-400',
};

/* ── 倒计时进度条 ────────────────────── */
function ToastProgress({ duration }: { duration: number }) {
  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full origin-left"
      initial={{ scaleX: 1 }}
      animate={{ scaleX: 0 }}
      transition={{ duration: duration / 1000, ease: 'linear' }}
    >
      <div className="h-full w-full bg-[var(--ui-text-secondary)]/20 rounded-full" />
    </motion.div>
  );
}

/* ── Dynamic Island 风格 Toast 容器 ────── */
function ToastContainer({ toasts, onRemove, closeLabel }: { toasts: Toast[]; onRemove: (id: string) => void; closeLabel: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div data-overlay-branch role="status" aria-live="polite" aria-atomic="true" className="app-ui fixed top-4 left-1/2 -translate-x-1/2 z-[300] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = TOAST_ICONS[toast.type];
          const elapsed = Date.now() - toast.createdAt;
          const remaining = Math.max(TOAST_DURATION - elapsed, 0);
          return (
            <motion.div
              key={toast.id}
              layout
              // Dynamic Island 弹簧弹入 + 模糊退出
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={uiTransition}
              className="ui-toast pointer-events-auto relative flex items-center gap-3 px-4 py-3 min-w-[200px] max-w-[calc(100vw-2rem)] sm:max-w-sm overflow-hidden cursor-pointer select-none"
              onClick={() => onRemove(toast.id)}
            >
              {/* 左侧彩色点 */}
              <span className={`w-2 h-2 rounded-full shrink-0 ${TOAST_ACCENT[toast.type]}`} />
              {/* 图标 */}
              <Icon size={16} className={`shrink-0 ${TOAST_ICON_COLORS[toast.type]}`} />
              {/* 文字 */}
              <span className="text-sm font-medium flex-1 break-words">{toast.message}</span>
              <button type="button" className="app-control ui-icon-button" aria-label={closeLabel} onClick={() => onRemove(toast.id)}><X size={16} /></button>
              {/* 进度条 */}
              <ToastProgress duration={remaining} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>, document.body
  );
}
