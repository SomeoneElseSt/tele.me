import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Eye, FlipHorizontal2, Gauge, GaugeCircle, Move, SlidersHorizontal, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { Tooltip } from '../../components/Tooltip'
import { useTooltipController } from '../../components/useTooltipController'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useRafLoop } from '../../hooks/useRafLoop'
import { usePointerDrag } from '../../hooks/usePointerDrag'
import { usePointerResize } from '../../hooks/usePointerResize'
import { PROMPTER_CONTROLS_MIN_WIDTH, PROMPTER_MIN_HEIGHT, PROMPTER_MIN_WIDTH, type PrompterFrame } from './types'

type Props = {
  open: boolean
  frame: PrompterFrame
  opacity: number
  script: string
  speed: number
  fontSize: number
  mirrorText: boolean
  playing: boolean
  onFrameChange: (update: Partial<PrompterFrame>) => void
  onOpacityChange: (value: number) => void
  onSpeedChange: (value: number) => void
  onFontSizeChange: (value: number) => void
  onMirrorTextChange: (value: boolean) => void
  onTogglePlaying: () => void
  onClose: () => void
}

const GRIP_HIT_SIZE_PX = 32
const GRIP_INSET_PX = 10
const GRIP_VISUAL_SIZE_PX = 38
const SCROLLBAR_BOTTOM_GUTTER_PX = GRIP_INSET_PX + GRIP_VISUAL_SIZE_PX + 6
const CONTROLS_BAR_GAP_PX = 10
const CONTROLS_BAR_MIN_MARGIN_PX = 12
const CONTROLS_BAR_HEIGHT_PX = 64
const PROMPTER_HEADER_HEIGHT_PX = 52
const DRAG_TOOLTIP_ID = 'studio-prompter-drag'

function TextSizeIcon({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex h-4 w-4 items-end justify-center gap-[1px] leading-none', className)}>
      <span className="text-[9px] font-semibold">A</span>
      <span className="text-[13px] font-semibold -translate-y-[0.5px]">A</span>
    </span>
  )
}

function toNumber(value: string) {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return null
  return parsed
}

function ControlCell({
  icon,
  title,
  value,
  min,
  max,
  step,
  onChange,
  formatValue
}: {
  icon: React.ReactNode
  title: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  formatValue?: (value: number) => string
}) {
  return (
    <div className="flex h-full min-w-0 flex-1 items-center gap-3 px-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/4 text-white/70">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="truncate text-[11px] font-medium text-white/60">{title}</div>
          <div className="shrink-0 tabular-nums text-[11px] font-medium text-white/45">
            {formatValue ? formatValue(value) : `${value}`}
          </div>
        </div>
        <input
          aria-label={title}
          title={title}
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const next = toNumber(e.target.value)
            if (next == null) return
            onChange(next)
          }}
          className={cn(
            'mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 outline-none',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3',
            '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/75',
            '[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/25',
            '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110',
            '[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white/75',
            '[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white/25'
          )}
        />
      </div>
    </div>
  )
}

function ControlsBarPortal({
  open,
  frame,
  opacity,
  speed,
  fontSize,
  mirrorText,
  onOpacityChange,
  onSpeedChange,
  onFontSizeChange,
  onMirrorTextChange
}: {
  open: boolean
  frame: PrompterFrame
  opacity: number
  speed: number
  fontSize: number
  mirrorText: boolean
  onOpacityChange: (value: number) => void
  onSpeedChange: (value: number) => void
  onFontSizeChange: (value: number) => void
  onMirrorTextChange: (value: boolean) => void
}) {
  const barAlpha = Math.min(0.95, Math.max(0.18, opacity + 0.22))
  const spaceAbove = frame.y - CONTROLS_BAR_GAP_PX - CONTROLS_BAR_HEIGHT_PX
  const hysteresis = 18
  const upperThreshold = CONTROLS_BAR_MIN_MARGIN_PX + hysteresis
  const lowerThreshold = CONTROLS_BAR_MIN_MARGIN_PX - hysteresis
  const [side, setSide] = useState<'top' | 'bottom'>(() =>
    spaceAbove >= CONTROLS_BAR_MIN_MARGIN_PX ? 'top' : 'bottom'
  )

  useEffect(() => {
    if (!open) return
    const next = spaceAbove >= CONTROLS_BAR_MIN_MARGIN_PX ? 'top' : 'bottom'
    setSide(next)
  }, [open, spaceAbove])

  useEffect(() => {
    if (side === 'top' && spaceAbove < lowerThreshold) {
      setSide('bottom')
      return
    }
    if (side === 'bottom' && spaceAbove > upperThreshold) {
      setSide('top')
    }
  }, [lowerThreshold, side, spaceAbove, upperThreshold])

  const isTop = side === 'top'
  const top = isTop
    ? frame.y - CONTROLS_BAR_HEIGHT_PX - CONTROLS_BAR_GAP_PX
    : frame.y + frame.height + CONTROLS_BAR_GAP_PX
  const yOffset = isTop ? 14 : -14
  const rotateStart = isTop ? 76 : -76
  const origin = isTop ? 'bottom' : 'top'

  const portalEl =
    typeof document === 'undefined'
      ? null
      : (document.getElementById('studio-portal') ?? document.body)

  if (!portalEl) return null

  return createPortal(
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className="pointer-events-auto fixed z-[35]"
          style={{
            left: frame.x,
            top,
            width: frame.width,
            perspective: 1200
          }}
          animate={{ top }}
          transition={{ type: 'spring', stiffness: 360, damping: 48, mass: 0.9 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <motion.div
            className="overflow-hidden rounded-2xl border border-white/10 shadow-glow"
            style={{
              backgroundColor: `rgba(0,0,0,${barAlpha})`,
              transform: 'translateZ(0)',
              willChange: 'transform'
            }}
            initial={{ opacity: 0, y: yOffset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: yOffset }}
            transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }}
          >
            <motion.div
              key={side}
              className="relative"
              style={{
                transformOrigin: origin,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transformStyle: 'preserve-3d',
                willChange: 'transform'
              }}
              initial={{ rotateX: rotateStart }}
              animate={{ rotateX: 0 }}
              exit={{ rotateX: rotateStart }}
              transition={{ type: 'spring', stiffness: 460, damping: 40, mass: 0.7 }}
            >
              <div
                className={cn(
                  'relative flex h-[64px] items-stretch',
                  'divide-x divide-white/10'
                )}
              >
                <ControlCell
                  icon={<GaugeCircle className="h-4 w-4" />}
                  title="Speed"
                  value={speed}
                  min={10}
                  max={180}
                  step={1}
                  formatValue={(v) => `${Math.round(v)}`}
                  onChange={onSpeedChange}
                />
                <ControlCell
                  icon={<TextSizeIcon />}
                  title="Text size"
                  value={fontSize}
                  min={22}
                  max={72}
                  step={1}
                  formatValue={(v) => `${Math.round(v)}px`}
                  onChange={onFontSizeChange}
                />
                <ControlCell
                  icon={<Eye className="h-4 w-4" />}
                  title="Opacity"
                  value={opacity}
                  min={0.15}
                  max={0.95}
                  step={0.01}
                  formatValue={(v) => `${Math.round(v * 100)}%`}
                  onChange={onOpacityChange}
                />

                <div className="flex w-[104px] items-center justify-center px-3">
                  <Tooltip label="Mirror text">
                    <button
                      type="button"
                      onClick={() => onMirrorTextChange(!mirrorText)}
                      aria-label="Mirror text"
                      className={cn(
                        'inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs transition-colors',
                        mirrorText
                          ? 'border-white/18 bg-white/10 text-white'
                          : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/8'
                      )}
                    >
                      <FlipHorizontal2 className="h-4 w-4 text-white/70" />
                      <span
                        className={cn(
                          'relative inline-flex h-5 w-8 items-center rounded-full border border-white/10 bg-white/8 transition-colors',
                          mirrorText && 'bg-white/15'
                        )}
                        aria-hidden="true"
                      >
                        <span
                          className={cn(
                            'absolute left-[2px] top-[2px] h-[14px] w-[14px] rounded-full bg-white/70 transition-transform',
                            mirrorText ? 'translate-x-[14px]' : 'translate-x-0'
                          )}
                        />
                      </span>
                    </button>
                  </Tooltip>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalEl
  )
}

export function FloatingPrompter(props: Props) {
  const {
    open,
    frame,
    opacity,
    script,
    speed,
    fontSize,
    mirrorText,
    playing,
    onFrameChange,
    onOpacityChange,
    onSpeedChange,
    onFontSizeChange,
    onMirrorTextChange,
    onTogglePlaying,
    onClose
  } = props

  const tooltip = useTooltipController()
  const [quickOpen, setQuickOpen] = useState(false)
  const [resizing, setResizing] = useState(false)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const wasOpenRef = useRef(open)

  useRafLoop(
    (deltaMs) => {
      const el = scrollerRef.current
      if (!open) return
      if (!playing) return
      if (!el) return

      const deltaPx = (speed * deltaMs) / 1000
      el.scrollTop = el.scrollTop + deltaPx
    },
    open && playing
  )

  useHotkeys(
    useMemo(
      () => ({
        c: () => setQuickOpen((prev) => !prev),
        space: () => onTogglePlaying(),
        escape: () => {
          if (!playing) return
          onTogglePlaying()
        }
      }),
      [onTogglePlaying, playing]
    ),
    open
  )

  const drag = usePointerDrag({
    enabled: open,
    getOrigin: () => ({ x: frame.x, y: frame.y }),
    onMove: (next) => onFrameChange({ x: next.x, y: next.y }),
    onEnd: () => tooltip.unlock(DRAG_TOOLTIP_ID)
  })

  const minWidth = Math.max(PROMPTER_MIN_WIDTH, PROMPTER_CONTROLS_MIN_WIDTH)
  const resize = usePointerResize({
    enabled: open,
    getOrigin: () => ({ width: frame.width, height: frame.height }),
    onResize: (next) =>
      onFrameChange({
        width: Math.max(minWidth, next.width),
        height: Math.max(PROMPTER_MIN_HEIGHT, next.height)
      }),
    onEnd: () => setResizing(false)
  })

  const onResizePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return
      setResizing(true)
      resize.onPointerDown(event)
    },
    [resize]
  )

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      tooltip.clear()
      setResizing(false)
      setQuickOpen(false)
    }
    wasOpenRef.current = open
  }, [open, tooltip])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn('fixed z-40 overflow-hidden rounded-2xl border border-white/10 shadow-glow')}
          style={{
            width: frame.width,
            height: frame.height,
            x: frame.x,
            y: frame.y,
            backgroundColor: `rgba(0,0,0,${opacity})`
          }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 420, damping: 40, mass: 0.8 }}
        >
          <div
            className={cn(
              'flex items-center justify-between gap-2 border-b border-white/10 px-4 text-white/85',
              'cursor-grab active:cursor-grabbing select-none touch-none'
            )}
            style={{ height: PROMPTER_HEADER_HEIGHT_PX }}
            onPointerDown={drag.onPointerDown}
          >
            <Tooltip label="Hide prompter" shortcut="H">
              <button
                type="button"
                onClick={onClose}
                aria-label="Hide prompter"
                onPointerDown={(e) => e.stopPropagation()}
                className={cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70',
                  'hover:bg-white/10 hover:text-white'
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </Tooltip>
            <div className="flex items-center gap-1">
              <Tooltip label="Controls" shortcut="C">
                <button
                  type="button"
                  onClick={() => setQuickOpen((v) => !v)}
                  aria-label="Prompter controls"
                  onPointerDown={(e) => e.stopPropagation()}
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70',
                    'hover:bg-white/10 hover:text-white',
                    quickOpen && 'border-white/18 bg-white/10 text-white'
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip label="Drag" tooltipId={DRAG_TOOLTIP_ID}>
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6"
                  onPointerDown={() => tooltip.lock(DRAG_TOOLTIP_ID)}
                >
                  <Move className="h-4 w-4 text-white/60" />
                </span>
              </Tooltip>
            </div>
          </div>

          <div className="relative h-[calc(100%-52px)]">
            <div
              ref={scrollerRef}
              className={cn('tele-scroll absolute left-0 top-0 right-0 z-10 overflow-y-auto')}
              style={{ bottom: SCROLLBAR_BOTTOM_GUTTER_PX }}
            >
              <div className={cn('px-6 py-6 text-white/92', mirrorText && '-scale-x-100')}>
                <pre
                  className="whitespace-pre-wrap font-medium leading-[1.35] tracking-[-0.02em]"
                  style={{ fontSize }}
                >
                  {script}
                </pre>
              </div>
            </div>

            <div
              aria-hidden="true"
              className={cn('grip-visual absolute z-0', resizing && 'is-active')}
              style={{
                right: GRIP_INSET_PX,
                bottom: GRIP_INSET_PX,
                width: GRIP_VISUAL_SIZE_PX,
                height: GRIP_VISUAL_SIZE_PX
              }}
            />
          </div>

          <div
            className={cn('grip-hit absolute z-20 cursor-nwse-resize touch-none')}
            style={{
              right: GRIP_INSET_PX,
              bottom: GRIP_INSET_PX,
              width: GRIP_HIT_SIZE_PX,
              height: GRIP_HIT_SIZE_PX
            }}
            onPointerDown={onResizePointerDown}
          />

          <ControlsBarPortal
            open={quickOpen}
            frame={frame}
            opacity={opacity}
            speed={speed}
            fontSize={fontSize}
            mirrorText={mirrorText}
            onOpacityChange={onOpacityChange}
            onSpeedChange={onSpeedChange}
            onFontSizeChange={onFontSizeChange}
            onMirrorTextChange={onMirrorTextChange}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
