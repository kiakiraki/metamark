import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useToastStore } from '@/hooks/useToast';
import { XIcon } from '@/components/ui/icons';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={clsx(
              'flex max-w-sm cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium text-zinc-100 shadow-xl shadow-black/40 backdrop-blur-sm',
              {
                'border-emerald-500/30 bg-emerald-600/90':
                  toast.type === 'success',
                'border-red-500/30 bg-red-600/90': toast.type === 'error',
                'border-white/10 bg-surface-2/95': toast.type === 'info',
              }
            )}
            onClick={() => removeToast(toast.id)}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              aria-label="Close notification"
              className="flex-shrink-0 rounded p-0.5 text-current/80 transition hover:text-current focus:outline-none focus:ring-2 focus:ring-white/70"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
            >
              <XIcon size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
