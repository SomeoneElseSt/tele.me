import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

type Props = {
  open: boolean
  onClose: () => void
  script: string
  onScriptChange: (value: string) => void
}

export function SettingsDrawer(props: Props) {
  const { open, onClose, script, onScriptChange } = props

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className={cn(
              'fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-white/10 bg-black/70 backdrop-blur',
              'p-5'
            )}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <header className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white/90">Script</div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/75 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="mt-5 flex h-[calc(100%-72px)] flex-col gap-5 overflow-y-auto tele-scroll pr-1">
              <section className="space-y-3">
                <div className="text-xs text-white/55">Script</div>
                <textarea
                  value={script}
                  onChange={(e) => onScriptChange(e.target.value)}
                  className={cn(
                    'min-h-[220px] w-full resize-none rounded-2xl border bg-white/4 px-4 py-3 text-sm text-white/85',
                    'border-white/10 focus:outline-none focus:ring-2 focus:ring-white/25'
                  )}
                />
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
