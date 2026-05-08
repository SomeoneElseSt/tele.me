import { useEffect, useRef, useState } from 'react'
import { Hourglass, Pencil, Pause, Play, RotateCcw } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { Tooltip } from '../../components/Tooltip'
import { useI18n } from './i18n'

/** Dispatched from Studio when the user presses T while the prompter is open. */
export const PROMPTER_TIMER_HOTKEY_EVENT = 'teleme:prompter-timer-hotkey'

type Props = {
  /** When true, the bar is at the top of the prompter and the popover opens downward. */
  expandPopoverDown: boolean
  isPip: boolean
  open: boolean
  // Lifted to FloatingPrompter so state survives PiP window transitions
  budgetMs: number | null
  onBudgetMsChange: (ms: number | null) => void
  remainingMs: number
  onRemainingMsChange: (ms: number | ((prev: number) => number)) => void
  wantsRun: boolean
  onWantsRunChange: (run: boolean) => void
}

const TICK_MS = 100
const MAX_TOTAL_SEC = 99 * 60 + 59

const TIMER_BUTTON_LAYOUT_SPRING = { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.7 }
const TIMER_ICON_EXIT_TRANSITION = { duration: 0.12, ease: 'easeOut' as const }
const TIMER_CHIP_CONTENT_TRANSITION = { duration: 0.15, ease: 'easeOut' as const }

function formatCountdownMs(ms: number) {
  const secDisplay = ms <= 0 ? 0 : Math.ceil(ms / 1000)
  const m = Math.floor(secDisplay / 60)
  const s = secDisplay % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseTotalSeconds(minStr: string, secStr: string): number | null {
  const min = Math.max(0, Math.floor(Number(minStr) || 0))
  const sec = Math.max(0, Math.floor(Number(secStr) || 0))
  const total = min * 60 + sec
  if (total < 1 || total > MAX_TOTAL_SEC) return null
  return total
}

export function PrompterBarCountdown({
  expandPopoverDown,
  isPip,
  open,
  budgetMs,
  onBudgetMsChange,
  remainingMs,
  onRemainingMsChange,
  wantsRun,
  onWantsRunChange,
}: Props) {
  const { strings } = useI18n()
  const [panel, setPanel] = useState<null | 'setup' | 'actions'>(null)
  const [suppressActionTooltips, setSuppressActionTooltips] = useState(false)
  const [minutesInput, setMinutesInput] = useState('5')
  const [secondsInput, setSecondsInput] = useState('0')
  const anchorRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const configuredRef = useRef(false)

  const configured = budgetMs != null && budgetMs > 0
  configuredRef.current = configured

  const [chipExpanded, setChipExpanded] = useState(() => configured)
  const [hourglassInChip, setHourglassInChip] = useState(() => !configured)
  const prevConfiguredRef = useRef(configured)

  useEffect(() => {
    const wasConfigured = prevConfiguredRef.current
    prevConfiguredRef.current = configured

    if (!configured) {
      setChipExpanded(false)
      setHourglassInChip(true)
      return
    }
    if (wasConfigured) return

    setChipExpanded(false)
    setHourglassInChip(true)
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setHourglassInChip(false))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [configured])

  useEffect(() => {
    if (!panel) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (popoverRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      setPanel(null)
    }
    const win = anchorRef.current?.ownerDocument?.defaultView ?? window
    win.addEventListener('pointerdown', onPointerDown, true)
    return () => win.removeEventListener('pointerdown', onPointerDown, true)
  }, [panel, open])

  useEffect(() => {
    if (!open || !wantsRun) return
    const id = window.setInterval(() => {
      onRemainingMsChange((prev) => (prev <= 0 ? 0 : Math.max(0, prev - TICK_MS)))
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [open, wantsRun, onRemainingMsChange])

  useEffect(() => {
    if (remainingMs > 0 || !wantsRun) return
    onWantsRunChange(false)
  }, [remainingMs, wantsRun, onWantsRunChange])

  useEffect(() => {
    if (!open) return
    const onGlobalTimerHotkey = () => {
      setPanel((p) => {
        const target = configured ? 'actions' : 'setup'
        return p === target ? null : target
      })
    }
    window.addEventListener(PROMPTER_TIMER_HOTKEY_EVENT, onGlobalTimerHotkey)
    return () => window.removeEventListener(PROMPTER_TIMER_HOTKEY_EVENT, onGlobalTimerHotkey)
  }, [open, configured])

  const applyDuration = () => {
    const totalSec = parseTotalSeconds(minutesInput, secondsInput)
    if (totalSec == null) return
    const ms = totalSec * 1000
    onBudgetMsChange(ms)
    onRemainingMsChange(ms)
    onWantsRunChange(false)
    setPanel(null)
  }

  const openSetupFromActions = () => {
    if (budgetMs != null) {
      const totalSec = Math.ceil(budgetMs / 1000)
      setMinutesInput(String(Math.floor(totalSec / 60)))
      setSecondsInput(String(totalSec % 60))
    }
    setPanel('setup')
  }

  const onMainClick = () => {
    if (!configured) {
      setPanel((p) => (p === 'setup' ? null : 'setup'))
      return
    }
    setPanel((p) => (p === 'actions' ? null : 'actions'))
  }

  const closePanelAfterTooltip = () => {
    setSuppressActionTooltips(true)
    requestAnimationFrame(() => {
      setPanel(null)
      setSuppressActionTooltips(false)
    })
  }

  const onPlay = () => {
    if (budgetMs == null) return
    onRemainingMsChange((prev) => (prev <= 0 ? budgetMs : prev))
    onWantsRunChange(true)
    closePanelAfterTooltip()
  }

  const onPause = () => {
    onWantsRunChange(false)
  }

  const onReset = () => {
    if (budgetMs == null) return
    onRemainingMsChange(budgetMs)
    onWantsRunChange(false)
  }

  const ACTION_BTN = 'inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/70 outline-none hover:border-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25'

  return (
    <div ref={anchorRef} className="relative">
      <Tooltip enabled={!isPip} side={expandPopoverDown ? 'top' : 'bottom'} label={strings.prompterTimer} shortcut="T">
        <motion.button
          type="button"
          layout
          transition={TIMER_BUTTON_LAYOUT_SPRING}
          onClick={onMainClick}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={strings.prompterTimer}
          className={cn(
            chipExpanded
              ? 'inline-flex h-10 min-w-[4.25rem] items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/6 px-2.5 text-white/85 outline-none tabular-nums'
              : 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70 outline-none',
            'hover:bg-white/10 hover:text-white',
          )}
        >
          <AnimatePresence
            mode="wait"
            initial={false}
            onExitComplete={() => {
              if (!configuredRef.current) return
              setChipExpanded(true)
            }}
          >
            {hourglassInChip ? (
              <motion.span
                key="hourglass-chip"
                className="inline-flex shrink-0 items-center justify-center"
                initial={false}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={TIMER_ICON_EXIT_TRANSITION}
              >
                <Hourglass className="h-4 w-4" />
              </motion.span>
            ) : chipExpanded ? (
              <motion.span
                key="timer-digits"
                className="text-[13px] tracking-tight tabular-nums"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TIMER_CHIP_CONTENT_TRANSITION}
              >
                {formatCountdownMs(remainingMs)}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.button>
      </Tooltip>

      <AnimatePresence>
        {panel && (
          <motion.div
            ref={popoverRef}
            className={cn(
              'absolute left-0 z-[80] rounded-xl border border-white/10 bg-black/90 p-1.5 shadow-glow backdrop-blur',
              expandPopoverDown ? 'top-full mt-2' : 'bottom-full mb-2'
            )}
            initial={{ opacity: 0, y: expandPopoverDown ? -4 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: expandPopoverDown ? -4 : 4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {panel === 'setup' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-end gap-1.5">
                  <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase tracking-wider text-white/45">
                    {strings.prompterTimerMinutes}
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={minutesInput}
                      onChange={(e) => setMinutesInput(e.target.value)}
                      className="h-9 w-14 rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white tabular-nums outline-none focus:border-white/20"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5 text-[10px] font-medium uppercase tracking-wider text-white/45">
                    {strings.prompterTimerSeconds}
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={secondsInput}
                      onChange={(e) => setSecondsInput(e.target.value)}
                      className="h-9 w-14 rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white tabular-nums outline-none focus:border-white/20"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={applyDuration}
                  className="rounded-lg border border-transparent bg-white/10 py-1.5 text-xs font-medium text-white outline-none hover:border-white/25 hover:bg-white/14 focus-visible:border-white/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/20"
                >
                  {strings.prompterTimerSet}
                </button>
              </div>
            )}
            {panel === 'actions' && configured && (
              <div className="flex items-center gap-1">
                <Tooltip enabled={!suppressActionTooltips} side={expandPopoverDown ? 'bottom' : 'top'} label={wantsRun ? strings.prompterTimerPause : strings.prompterTimerStart}>
                  <button
                    type="button"
                    onClick={wantsRun ? onPause : onPlay}
                    className={ACTION_BTN}
                    aria-label={wantsRun ? strings.prompterTimerPause : strings.prompterTimerStart}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={wantsRun ? 'pause' : 'play'}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.12, ease: 'easeOut' }}
                        className="inline-flex"
                      >
                        {wantsRun ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                </Tooltip>
                <Tooltip side={expandPopoverDown ? 'bottom' : 'top'} label={strings.prompterTimerReset}>
                  <button type="button" onClick={onReset} className={ACTION_BTN} aria-label={strings.prompterTimerReset}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                <Tooltip side={expandPopoverDown ? 'bottom' : 'top'} label={strings.prompterTimerEditDuration}>
                  <button type="button" onClick={openSetupFromActions} className={ACTION_BTN} aria-label={strings.prompterTimerEditDuration}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
