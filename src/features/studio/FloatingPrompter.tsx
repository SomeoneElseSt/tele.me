import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType, PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { FlipHorizontal2, Move, SlidersHorizontal, X } from 'lucide-react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion'
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

function clamp01(value: number) {
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value
}

function SpeedThumb({ t }: { t: MotionValue<number> }) {
  // Keep the needle within the top semicircle (avoid dipping below the baseline at the extremes).
  const radians = useTransform(t, (v) => ((-80 + v * 160) * Math.PI) / 180)
  const needleLength = 5.4
  const x2 = useTransform(radians, (angle) => 12 + Math.sin(angle) * needleLength)
  const y2 = useTransform(radians, (angle) => 14 - Math.cos(angle) * needleLength)
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none">
      <path d="M5 14a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="14" r="1.2" fill="currentColor" fillOpacity="0.1" />
      <motion.line
        x1="12"
        y1="14"
        x2={x2}
        y2={y2}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TextSizeThumb({ t }: { t: MotionValue<number> }) {
  const scale = useTransform(t, (v) => (0.82 + v * 0.58) * 0.7)
  return (
    <motion.span
      className="text-[13px] font-semibold leading-none"
      // Text renders "filled" and can read brighter than the stroked SVG icons; dial it back a bit.
      style={{ scale, transformOrigin: 'center', opacity: 0.72 }}
    >
      A
    </motion.span>
  )
}

function OpacityThumb({ t }: { t: MotionValue<number> }) {
  const r = useTransform(t, (v) => 1.6 + v * 4.4)
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
      <motion.circle cx="12" cy="12" r={r} fill="currentColor" />
    </svg>
  )
}

function toNumber(value: string) {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return null
  return parsed
}

function ControlCell({
  Thumb,
  title,
  value,
  min,
  max,
  step,
  onChange,
  formatValue
}: {
  Thumb: ComponentType<{ t: MotionValue<number> }>
  title: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  formatValue?: (value: number) => string
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const decimals = useMemo(() => {
    const text = `${step}`
    const idx = text.indexOf('.')
    return idx === -1 ? 0 : text.length - idx - 1
  }, [step])

  const t = useMemo(() => {
    if (max === min) return 0
    return clamp01((value - min) / (max - min))
  }, [max, min, value])

  const tTarget = useMotionValue(t)
  const tSpring = useSpring(tTarget, { stiffness: 520, damping: 46, mass: 1.25 })
  const left = useTransform(tSpring, (v) => `${v * 100}%`)
  const fillWidth = useTransform(tSpring, (v) => `${v * 100}%`)

  useEffect(() => {
    tTarget.set(t)
  }, [t, tTarget])

  const setValueFromClientX = useCallback(
    (clientX: number, el: HTMLElement) => {
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0) return
      const nextT = clamp01((clientX - rect.left) / rect.width)
      const raw = min + nextT * (max - min)
      const stepped = Math.round((raw - min) / step) * step + min
      const clamped = Math.min(max, Math.max(min, stepped))
      const fixed = Number(clamped.toFixed(decimals))
      const next = Math.min(max, Math.max(min, fixed))
      onChange(next)
      if (max !== min) tTarget.set(clamp01((next - min) / (max - min)))
    },
    [decimals, max, min, onChange, step, tTarget]
  )

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      event.preventDefault()
      activePointerIdRef.current = event.pointerId
      setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
      setValueFromClientX(event.clientX, event.currentTarget)
    },
    [setValueFromClientX]
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== event.pointerId) return
      event.preventDefault()
      setValueFromClientX(event.clientX, event.currentTarget)
    },
    [setValueFromClientX]
  )

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return
    activePointerIdRef.current = null
    setDragging(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // no-op
    }
  }, [])

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col px-4 pt-3 pb-1.5">
      <div className="flex items-end justify-between gap-3">
        <div className="truncate text-[13px] font-medium leading-none text-white/70">{title}</div>
        <div className="shrink-0 tabular-nums text-[13px] font-medium leading-none text-white/55">
          {formatValue ? formatValue(value) : `${value}`}
        </div>
      </div>

      <div className="relative mt-2 h-8">
        <div
          className={cn(
            'relative mx-4 h-full touch-none select-none',
            'cursor-pointer outline-none'
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-white/10" />
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-white/18"
            style={{ width: fillWidth }}
          />

          <motion.div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left }}>
            <div
              className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/70',
                // "Liquid glass" thumb: heavy blur + darker tint so the track doesn't read through the thumb.
                'bg-black/75',
                'backdrop-blur-[72px] backdrop-brightness-[0.35] backdrop-contrast-[0.35] backdrop-saturate-150',
                'shadow-[0_0_0_1px_rgba(0,0,0,0.45),0_14px_30px_rgba(0,0,0,0.45)]',
                'cursor-grab',
                dragging
                  ? // Slightly brighter while dragging, keep blur/tint intact.
                    'scale-[1.07] cursor-grabbing border-white/55 text-white/95 shadow-[0_0_0_1px_rgba(255,255,255,0.3),0_0_18px_rgba(255,255,255,0.08),0_18px_34px_rgba(0,0,0,0.55)]'
                  : 'transition-[transform,background-color,border-color,color] duration-220 ease-out'
              )}
            >
              <div
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute inset-0 rounded-full',
                  dragging ? 'bg-black/45' : 'bg-black/45'
                )}
              />
              {dragging && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full bg-white/12"
                />
              )}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-white/0"
              />
              <Thumb t={tSpring} />
            </div>
          </motion.div>

          <input
            ref={inputRef}
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
            className="sr-only focus:outline-none"
          />
        </div>
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
                  Thumb={SpeedThumb}
                  title="Speed"
                  value={speed}
                  min={10}
                  max={180}
                  step={1}
                  formatValue={(v) => `${Math.round(v)}`}
                  onChange={onSpeedChange}
                />
                <ControlCell
                  Thumb={TextSizeThumb}
                  title="Text size"
                  value={fontSize}
                  min={22}
                  max={72}
                  step={1}
                  formatValue={(v) => `${Math.round(v)}px`}
                  onChange={onFontSizeChange}
                />
                <ControlCell
                  Thumb={OpacityThumb}
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
