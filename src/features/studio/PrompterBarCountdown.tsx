import { useEffect, useRef, useState } from 'react'
import { Hourglass, Pencil, Pause, Play, RotateCcw } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { Tooltip } from '../../components/Tooltip'
import { useI18n } from './i18n'

/** Dispatched from Studio when the user presses T (timer) while the prompter is open. */
export const PROMPTER_TIMER_HOTKEY_EVENT = 'teleme:prompter-timer-hotkey'

type Props = {
  disabled: boolean
  /** When true, the bar is at the top of the prompter and the popover opens downward. */
  expandPopoverDown: boolean
  open: boolean
  /** Whether the studio recorder is running; passed through for future UX. The timer is not blocked when false. */
  isRecording: boolean
}

const TICK_MS = 100
const MAX_TOTAL_SEC = 99 * 60 + 59

function formatCountdownMs(ms: number) {
  const secDisplay = ms <= 0 ? 0 : Math.ceil(ms / 1000)
  const m = Math.floor(secDisplay / 60)
  const s = secDisplay % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseTotalSeconds(minStr: string, secStr: string): number | null {
  const min = Math.max(0, Math.min(99, Math.floor(Number(minStr) || 0)))
  const sec = Math.max(0, Math.min(59, Math.floor(Number(secStr) || 0)))
  const total = min * 60 + sec
  if (total < 1 || total > MAX_TOTAL_SEC) return null
  return total
}

export function PrompterBarCountdown({ disabled, expandPopoverDown, open, isRecording }: Props) {
  const { strings } = useI18n()
  const [budgetMs, setBudgetMs] = useState<number | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)
  const [wantsRun, setWantsRun] = useState(false)
  const [panel, setPanel] = useState<null | 'setup' | 'actions'>(null)
  const [minutesInput, setMinutesInput] = useState('5')
  const [secondsInput, setSecondsInput] = useState('0')
  const anchorRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const configured = budgetMs != null && budgetMs > 0

  useEffect(() => {
    if (!panel) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (popoverRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      setPanel(null)
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => window.removeEventListener('pointerdown', onPointerDown, true)
  }, [panel])

  useEffect(() => {
    if (!open || !wantsRun) return
    const id = window.setInterval(() => {
      setRemainingMs((prev) => {
        if (prev <= 0) return 0
        return Math.max(0, prev - TICK_MS)
      })
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [open, wantsRun])

  useEffect(() => {
    if (remainingMs > 0) return
    if (!wantsRun) return
    setWantsRun(false)
  }, [remainingMs, wantsRun])

  const applyDuration = () => {
    const totalSec = parseTotalSeconds(minutesInput, secondsInput)
    if (totalSec == null) return
    const ms = totalSec * 1000
    setBudgetMs(ms)
    setRemainingMs(ms)
    setWantsRun(false)
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
    if (disabled) return
    if (!configured) {
      setPanel((p) => (p === 'setup' ? null : 'setup'))
      return
    }
    setPanel((p) => (p === 'actions' ? null : 'actions'))
  }

  const onPlay = () => {
    if (!configured || budgetMs == null) return
    setRemainingMs((prev) => (prev <= 0 ? budgetMs : prev))
    setWantsRun(true)
    setPanel(null)
  }

  const onPause = () => {
    setWantsRun(false)
    setPanel(null)
  }

  const onReset = () => {
    if (budgetMs == null) return
    setRemainingMs(budgetMs)
    setWantsRun(false)
    setPanel(null)
  }

  useEffect(() => {
    if (!open || disabled) return
    const onGlobalTimerHotkey = () => {
      if (!configured) {
        setPanel((p) => (p === 'setup' ? null : 'setup'))
        return
      }
      setPanel((p) => (p === 'actions' ? null : 'actions'))
    }
    window.addEventListener(PROMPTER_TIMER_HOTKEY_EVENT, onGlobalTimerHotkey)
    return () => window.removeEventListener(PROMPTER_TIMER_HOTKEY_EVENT, onGlobalTimerHotkey)
  }, [open, disabled, configured])

  return (
    <div ref={anchorRef} className="relative" data-recording={isRecording ? 'true' : 'false'}>
      <Tooltip enabled={!disabled} label={strings.prompterTimer} shortcut="T">
        <button
          type="button"
          onClick={onMainClick}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={strings.prompterTimer}
          className={cn(
            configured
              ? 'inline-flex h-10 min-w-[4.25rem] items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/6 px-2.5 text-white/85 outline-none tabular-nums'
              : 'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70 outline-none',
            'hover:bg-white/10 hover:text-white',
            wantsRun && remainingMs > 0 && 'border-white/18 bg-white/10 text-white',
            disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
          )}
          disabled={disabled}
        >
          {configured ? (
            <span className="text-[13px] font-semibold tracking-tight">{formatCountdownMs(remainingMs)}</span>
          ) : (
            <Hourglass className="h-4 w-4" />
          )}
        </button>
      </Tooltip>

      <AnimatePresence>
        {panel && !disabled && (
          <motion.div
            ref={popoverRef}
            className={cn(
              'absolute left-1/2 z-[80] -translate-x-1/2 rounded-xl border border-white/10 bg-black/90 px-2.5 py-1.5 shadow-glow backdrop-blur',
              expandPopoverDown ? 'top-full mt-2' : 'bottom-full mb-2'
            )}
            initial={{ opacity: 0, y: expandPopoverDown ? -4 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: expandPopoverDown ? -4 : 4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {panel === 'setup' && (
              <div className="flex flex-col gap-2 px-1 py-0.5">
                <div className="flex items-end gap-2">
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
              <div className="flex items-center gap-1.5 px-0.5">
                <Tooltip label={strings.prompterTimerStart}>
                  <button
                    type="button"
                    onClick={onPlay}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25"
                    aria-label={strings.prompterTimerStart}
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                <Tooltip label={strings.prompterTimerPause}>
                  <button
                    type="button"
                    onClick={onPause}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25"
                    aria-label={strings.prompterTimerPause}
                  >
                    <Pause className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                <Tooltip label={strings.prompterTimerReset}>
                  <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25"
                    aria-label={strings.prompterTimerReset}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                <Tooltip label={strings.prompterTimerEditDuration}>
                  <button
                    type="button"
                    onClick={openSetupFromActions}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/25"
                    aria-label={strings.prompterTimerEditDuration}
                  >
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
