import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useToastStore } from '@/hooks/useToast';

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
              'flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer max-w-sm',
              {
                'bg-green-600 text-white': toast.type === 'success',
                'bg-red-600 text-white': toast.type === 'error',
                'bg-blue-600 text-white': toast.type === 'info',
              }
            )}
            onClick={() => removeToast(toast.id)}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              aria-label="Close notification"
              className="flex-shrink-0 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-white/70"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
