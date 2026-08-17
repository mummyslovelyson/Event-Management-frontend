import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ open, onClose, title, children, size = 'md', footer, hideClose = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className={`relative w-full ${sizes[size]} max-h-[90vh] flex flex-col rounded-2xl bg-[#171A1D] border border-[#262B2F] shadow-2xl shadow-black/50`}
          >
            {(title || !hideClose) && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#262B2F] shrink-0">
                {title ? (
                  <h3 className="text-base font-semibold text-[#EFEFF1]">{title}</h3>
                ) : (
                  <span />
                )}
                {!hideClose && (
                  <button
                    onClick={onClose}
                    className="p-2.5 rounded-lg text-[#949599] hover:text-[#EFEFF1] hover:bg-[#262B2F] transition"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <div className="px-5 py-4 border-t border-[#262B2F] shrink-0 flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
