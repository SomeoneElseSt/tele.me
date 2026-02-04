import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Props = {
  open: boolean
  onClose: () => void
}

function Key({ children }: { children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/6 px-2 py-1',
        'text-[11px] font-medium text-white/85'
      )}
    >
      {children}
    </span>
  )
}

export function HotkeysDialog({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b12]/90 shadow-glow'
            )}
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-white/90">Hotkeys</div>
                <div className="text-xs text-white/55">Fast controls while filming</div>
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-white/80 hover:bg-white/10 hover:text-white"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="px-5 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                  <div className="text-xs font-medium text-white/70">Teleprompter</div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-white/85">Play/Pause</div>
                    <div className="flex items-center gap-1">
                      <Key>Space</Key>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm text-white/85">Stop</div>
                    <div className="flex items-center gap-1">
                      <Key>Esc</Key>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                  <div className="text-xs font-medium text-white/70">Recording</div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-white/85">Record/Stop</div>
                    <div className="flex items-center gap-1">
                      <Key>R</Key>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm text-white/85">Hotkeys</div>
                    <div className="flex items-center gap-1">
                      <Key>?</Key>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-white/55">
                Hotkeys won’t trigger while typing in inputs/textarea.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
