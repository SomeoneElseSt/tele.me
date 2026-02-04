import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { Tooltip } from '../../components/Tooltip'
import { cn } from '../../lib/cn'

type Props = {
  open: boolean
  onClose: () => void
  script: string
  onScriptChange: (value: string) => void
}

export function SettingsDrawer(props: Props) {
  const { open, onClose, script, onScriptChange } = props
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const MIN_TEXTAREA_HEIGHT = 220
  const BOTTOM_PADDING = 24

  const syncTextarea = useCallback(() => {
    if (!open) return
    const textarea = textareaRef.current
    if (!textarea) return
    const container = scrollRef.current
    const box = boxRef.current
    const available = container && container.clientHeight > 0 ? container.clientHeight - BOTTOM_PADDING : null

    if (box && available != null) {
      box.style.maxHeight = `${Math.max(MIN_TEXTAREA_HEIGHT, available)}px`
    } else if (box) {
      box.style.maxHeight = ''
    }

    let maxTextareaHeight: number | null = null
    if (box && available != null) {
      const style = window.getComputedStyle(box)
      const chromeY =
        Number.parseFloat(style.paddingTop) +
        Number.parseFloat(style.paddingBottom) +
        Number.parseFloat(style.borderTopWidth) +
        Number.parseFloat(style.borderBottomWidth)
      maxTextareaHeight = Math.max(MIN_TEXTAREA_HEIGHT, available - chromeY)
    }

    textarea.style.height = 'auto'
    textarea.style.maxHeight = maxTextareaHeight != null ? `${maxTextareaHeight}px` : ''
    textarea.style.height = `${Math.max(MIN_TEXTAREA_HEIGHT, textarea.scrollHeight)}px`
  }, [open])

  useLayoutEffect(() => {
    syncTextarea()
  }, [script, syncTextarea])

  useEffect(() => {
    if (!open) return
    const onResize = () => syncTextarea()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, syncTextarea])

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
              <Tooltip label="Close" shortcut="Esc" side="auto" preferSide="left" sideOffset={14}>
                <span className="inline-flex h-10 w-10 items-center justify-center">
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/75 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              </Tooltip>
            </header>

            <div ref={scrollRef} className="mt-5 flex h-[calc(100%-72px)] flex-col gap-5 overflow-hidden pb-6">
              <section className="space-y-3">
                <div
                  ref={boxRef}
                  className={cn(
                    'w-full rounded-2xl border border-white/10 bg-white/4 px-4 py-3 pr-6',
                    'overflow-hidden focus-within:border-white/20 focus-within:bg-white/5'
                  )}
                >
                  <textarea
                    ref={textareaRef}
                    value={script}
                    onChange={(e) => onScriptChange(e.target.value)}
                    className={cn(
                      'tele-scroll min-h-[220px] w-full resize-none bg-transparent pr-4 text-sm text-white/85',
                      'focus:outline-none overflow-y-auto'
                    )}
                  />
                </div>
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
