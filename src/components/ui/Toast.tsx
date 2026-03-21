import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';
import { dynamicIslandSpring } from '@/lib/motion';

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

export function ToastProvider({ children }: { children: ReactNode }) {
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />
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
  success: 'text-emerald-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  warning: 'text-amber-400',
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
      <div className="h-full w-full bg-white/20 rounded-full" />
    </motion.div>
  );
}

/* ── Dynamic Island 风格 Toast 容器 ────── */
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
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
              initial={{ opacity: 0, y: -40, scale: 0.85, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(10px)' }}
              transition={dynamicIslandSpring}
              className="pointer-events-auto relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-full bg-zinc-900 dark:bg-zinc-800 text-white shadow-2xl shadow-black/20 dark:shadow-black/40 ring-1 ring-white/10 min-w-[200px] max-w-sm overflow-hidden cursor-pointer select-none"
              onClick={() => onRemove(toast.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* 左侧彩色点 */}
              <span className={`w-2 h-2 rounded-full shrink-0 ${TOAST_ACCENT[toast.type]}`} />
              {/* 图标 */}
              <Icon size={16} className={`shrink-0 ${TOAST_ICON_COLORS[toast.type]}`} />
              {/* 文字 */}
              <span className="text-sm font-medium flex-1 truncate">{toast.message}</span>
              {/* 进度条 */}
              <ToastProgress duration={remaining} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
