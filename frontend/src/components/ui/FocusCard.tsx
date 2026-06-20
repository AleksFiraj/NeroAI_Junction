import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function FocusCard({
  open,
  onClose,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-bg/70 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={`relative z-10 w-full ${width} overflow-hidden rounded-2xl border border-border-strong bg-surface-1 shadow-2xl`}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-md text-text-subtle transition-colors hover:bg-surface-2 hover:text-text"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
