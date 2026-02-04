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
  markdownEnabled: boolean
  onMarkdownEnabledChange: (value: boolean) => void
}

export function SettingsDrawer(props: Props) {
  const { open, onClose, script, onScriptChange, markdownEnabled, onMarkdownEnabledChange } = props
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
              <div className="flex items-center gap-2">
                <Tooltip label="Enable Markdown">
                  <button
                    type="button"
                    onClick={() => onMarkdownEnabledChange(!markdownEnabled)}
                    aria-label="Enable Markdown"
                    className={cn(
                      'inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-xs transition-colors',
                      markdownEnabled
                        ? 'border-white/18 bg-white/10 text-white'
                        : 'border-white/10 bg-white/6 text-white/70 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">MD</span>
                    <span
                      className={cn(
                        'relative inline-flex h-5 w-8 items-center rounded-full border border-white/10 bg-white/8 transition-colors',
                        markdownEnabled && 'bg-white/15'
                      )}
                      aria-hidden="true"
                    >
                      <span
                        className={cn(
                          'absolute left-[2px] top-[2px] h-[14px] w-[14px] rounded-full bg-white/70 transition-transform',
                          markdownEnabled ? 'translate-x-[14px]' : 'translate-x-0'
                        )}
                      />
                    </span>
                  </button>
                </Tooltip>
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
              </div>
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
