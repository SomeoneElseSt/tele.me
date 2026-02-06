import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ComponentType, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, ExternalLink, Eye, MonitorUp, Move, Pause, Play, SlidersHorizontal, X } from 'lucide-react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { cn } from '../../lib/cn'
import { Tooltip, TooltipProvider } from '../../components/Tooltip'
import { useTooltipController } from '../../components/useTooltipController'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useRafLoop } from '../../hooks/useRafLoop'
import { usePointerDrag } from '../../hooks/usePointerDrag'
import { usePointerResize } from '../../hooks/usePointerResize'
import { PROMPTER_CONTROLS_MIN_WIDTH, PROMPTER_MIN_HEIGHT, PROMPTER_MIN_WIDTH, type PrompterFrame } from './types'
import { useI18n, STRINGS } from './i18n'

type Props = {
  open: boolean
  frame: PrompterFrame
  opacity: number
  script: string
  markdownEnabled: boolean
  speed: number
  fontSize: number
  textAlign: 'left' | 'center' | 'right'
  playing: boolean
  fixedToTop: boolean
  onFrameChange: (update: Partial<PrompterFrame>) => void
  onOpacityChange: (value: number) => void
  onSpeedChange: (value: number) => void
  onFontSizeChange: (value: number) => void
  onTextAlignChange: (value: 'left' | 'center' | 'right') => void
  onFixedToTopChange: (value: boolean) => void
  onTogglePlaying: () => void
  onClose: () => void
  onControlsOpenChange?: (open: boolean) => void
  onPipChange?: (isPip: boolean) => void
  onMarkdownEnabledChange?: (enabled: boolean) => void
  forceCloseControls?: boolean
}

const GRIP_HIT_SIZE_PX = 32
const GRIP_INSET_PX = 10
const GRIP_VISUAL_SIZE_PX = 38
const SCROLLBAR_BOTTOM_GUTTER_PX = GRIP_INSET_PX + GRIP_VISUAL_SIZE_PX + 6
const CONTROLS_BAR_GAP_PX = 10
const CONTROLS_BAR_MIN_MARGIN_PX = 12
const CONTROLS_BAR_HEIGHT_PX = 76
const PROMPTER_HEADER_HEIGHT_PX = 52
const DRAG_TOOLTIP_ID = 'studio-prompter-drag'

function clamp01(value: number) {
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value
}

function SpeedThumb({ t }: { t: MotionValue<number> }) {
  // Keep the needle within the top semicircle (avoid dipping below the baseline at the extremes).
  const rawId = useId()
  const needleMaskId = useMemo(() => `speed-needle-mask-${rawId.replace(/[:]/g, '')}`, [rawId])
  const ARC_RADIUS = 7
  // Single hyperparameter to control stroke thickness.
  const BASE_STROKE = 1.2
  const ARC_STROKE = BASE_STROKE
  const NEEDLE_STROKE = BASE_STROKE * 0.9
  const NEEDLE_GAP = 0
  const innerArcRadius = ARC_RADIUS - ARC_STROKE / 2
  const needleReach = Math.max(0, innerArcRadius - NEEDLE_GAP)
  const radians = useTransform(t, (v) => ((-80 + v * 160) * Math.PI) / 180)
  const x2 = useTransform(radians, (angle) => 12 + Math.sin(angle) * needleReach)
  const y2 = useTransform(radians, (angle) => 14 - Math.cos(angle) * needleReach)
  // Mask radius accounts for stroke width to prevent clipping at edges
  const maskRadius = needleReach + NEEDLE_STROKE / 2
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <defs>
        <mask id={needleMaskId} maskUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="black" />
          <circle cx="12" cy="14" r={maskRadius} fill="white" />
        </mask>
      </defs>
      <circle cx="12" cy="14" r="1.2" fill="currentColor" fillOpacity="0.1" />
      <motion.line
        x1="12"
        y1="14"
        x2={x2}
        y2={y2}
        stroke="currentColor"
        strokeWidth={NEEDLE_STROKE}
        strokeLinecap="round"
        mask={`url(#${needleMaskId})`}
      />
      <path
        d="M5 14a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth={ARC_STROKE}
        strokeLinecap="round"
      />
    </svg>
  )
}

function TextSizeThumb({ t }: { t: MotionValue<number> }) {
  const scale = useTransform(t, (v) => (0.82 + v * 0.58) * 0.7)
  return (
    <motion.span
      className="text-[14px] font-semibold leading-none"
      // Text renders "filled" and can read brighter than the stroked SVG icons; dial it back a bit.
      style={{ scale, transformOrigin: 'center' }}
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

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g)
  return parts.map((part, idx) => {
    if (!part) return null
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={`code-${idx}`}
          className="rounded-md bg-white/10 px-1.5 py-0.5 text-[0.9em] text-white/90"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return (
        <strong key={`bold-${idx}`} className="font-semibold text-white/95">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return (
        <em key={`em-${idx}`} className="text-white/90">
          {part.slice(1, -1)}
        </em>
      )
    }
    return <span key={`text-${idx}`}>{part}</span>
  })
}

function renderMarkdownBlocks(text: string): ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (line.trim() === '') {
      blocks.push(<div key={`spacer-${i}`} className="h-4" />)
      i += 1
      continue
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line)
    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 1
      const textContent = headingMatch[2] ?? ''
      const headingClass = cn(
        'font-semibold tracking-[-0.02em] text-white',
        level === 1 && 'text-[1.45em] leading-[1.2] mb-3',
        level === 2 && 'text-[1.25em] leading-[1.25] mb-2.5',
        level === 3 && 'text-[1.1em] leading-[1.3] mb-2',
        level > 3 && 'text-[1em] leading-[1.35] mb-2'
      )
      if (level === 1) {
        blocks.push(
          <h1 key={`h-${i}`} className={headingClass}>
            {renderInlineMarkdown(textContent)}
          </h1>
        )
      } else if (level === 2) {
        blocks.push(
          <h2 key={`h-${i}`} className={headingClass}>
            {renderInlineMarkdown(textContent)}
          </h2>
        )
      } else if (level === 3) {
        blocks.push(
          <h3 key={`h-${i}`} className={headingClass}>
            {renderInlineMarkdown(textContent)}
          </h3>
        )
      } else if (level === 4) {
        blocks.push(
          <h4 key={`h-${i}`} className={headingClass}>
            {renderInlineMarkdown(textContent)}
          </h4>
        )
      } else if (level === 5) {
        blocks.push(
          <h5 key={`h-${i}`} className={headingClass}>
            {renderInlineMarkdown(textContent)}
          </h5>
        )
      } else {
        blocks.push(
          <h6 key={`h-${i}`} className={headingClass}>
            {renderInlineMarkdown(textContent)}
          </h6>
        )
      }
      i += 1
      continue
    }

    const ulMatch = /^\s*[-*+]\s+/.test(line)
    if (ulMatch) {
      const items: ReactNode[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i] ?? '')) {
        const itemText = (lines[i] ?? '').replace(/^\s*[-*+]\s+/, '')
        items.push(
          <li key={`ul-${i}`} className="mb-1.5 last:mb-0">
            {renderInlineMarkdown(itemText)}
          </li>
        )
        i += 1
      }
      blocks.push(
        <ul key={`ul-block-${i}`} className="mb-3 list-disc pl-6 text-white/92">
          {items}
        </ul>
      )
      continue
    }

    const olMatch = /^\s*\d+\.\s+/.test(line)
    if (olMatch) {
      const items: ReactNode[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? '')) {
        const itemText = (lines[i] ?? '').replace(/^\s*\d+\.\s+/, '')
        items.push(
          <li key={`ol-${i}`} className="mb-1.5 last:mb-0">
            {renderInlineMarkdown(itemText)}
          </li>
        )
        i += 1
      }
      blocks.push(
        <ol key={`ol-block-${i}`} className="mb-3 list-decimal pl-6 text-white/92">
          {items}
        </ol>
      )
      continue
    }

    const paragraphLines: string[] = []
    while (i < lines.length && (lines[i] ?? '').trim() !== '') {
      const currentLine = lines[i] ?? ''
      if (/^(#{1,6})\s+/.test(currentLine)) break
      if (/^\s*[-*+]\s+/.test(currentLine)) break
      if (/^\s*\d+\.\s+/.test(currentLine)) break
      paragraphLines.push(currentLine)
      i += 1
    }
    const paragraphText = paragraphLines.join('\n')
    const paragraphParts = paragraphText.split('\n')
    blocks.push(
      <p key={`p-${i}`} className="mb-3 last:mb-0 text-white/92">
        {paragraphParts.map((segment, idx) => (
          <span key={`p-${i}-${idx}`}>
            {renderInlineMarkdown(segment)}
            {idx < paragraphParts.length - 1 && <br />}
          </span>
        ))}
      </p>
    )
  }

  return blocks
}

function ControlCell({
  Thumb,
  title,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  disabled
}: {
  Thumb: ComponentType<{ t: MotionValue<number> }>
  title: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  formatValue?: (value: number) => string
  disabled?: boolean
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
    <div className="flex h-full min-w-0 flex-1 flex-col px-4 pt-4 pb-2">
      <div className={cn("flex items-end justify-between gap-3", disabled && "opacity-40")}>
        <div className="truncate text-[13px] font-medium leading-none text-white/70">{title}</div>
        <div className="shrink-0 tabular-nums text-[13px] font-medium leading-none text-white/55">
          {formatValue ? formatValue(value) : `${value}`}
        </div>
      </div>

      <div className={cn("relative mt-2.5 h-9", disabled && "pointer-events-none")}>
        <div
          className={cn(
            'relative mx-4 h-full touch-none select-none',
            'cursor-pointer outline-none',
            disabled && "blur-[2px] opacity-40"
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-white/30" />
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-white/46"
            style={{ width: fillWidth }}
          />

          <motion.div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left }}>
            <div
              className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-full border border-white/35 text-white/92',
                // Solid thumb (no blur) to fully mask the track underneath.
                'bg-black',
                'shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_16px_34px_rgba(0,0,0,0.55)]',
                'cursor-grab',
                dragging
                  ? // Slightly brighter while dragging, keep blur/tint intact.
                  'scale-[1.07] cursor-grabbing border-white/55 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.3),0_0_18px_rgba(255,255,255,0.08),0_18px_34px_rgba(0,0,0,0.55)]'
                  : 'transition-[transform,background-color,border-color,color] duration-220 ease-out'
              )}
            >
              {dragging && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full bg-white/8"
                />
              )}
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
  textAlign,
  fixedToTop,
  onOpacityChange,
  onSpeedChange,
  onFontSizeChange,
  onTextAlignChange,
  isPip,
  pipWindow
}: {
  open: boolean
  frame: PrompterFrame
  opacity: number
  speed: number
  fontSize: number
  textAlign: 'left' | 'center' | 'right'
  fixedToTop: boolean
  onOpacityChange: (value: number) => void
  onSpeedChange: (value: number) => void
  onFontSizeChange: (value: number) => void
  onTextAlignChange: (value: 'left' | 'center' | 'right') => void
  isPip?: boolean
  pipWindow?: any
}) {
  const { strings } = useI18n()
  // Match teleprompter opacity for visual consistency (no contrast difference)
  const barAlpha = opacity
  const spaceAbove = frame.y - CONTROLS_BAR_GAP_PX - CONTROLS_BAR_HEIGHT_PX
  const hysteresis = 18
  const upperThreshold = CONTROLS_BAR_MIN_MARGIN_PX + hysteresis
  const lowerThreshold = CONTROLS_BAR_MIN_MARGIN_PX - hysteresis
  const [side, setSide] = useState<'top' | 'bottom'>(() =>
    isPip ? 'top' : fixedToTop ? 'bottom' : spaceAbove >= CONTROLS_BAR_MIN_MARGIN_PX ? 'top' : 'bottom'
  )

  useEffect(() => {
    if (!open) return
    if (isPip) {
      setSide('top')
      return
    }
    if (fixedToTop) {
      setSide('bottom')
      return
    }
    const next = spaceAbove >= CONTROLS_BAR_MIN_MARGIN_PX ? 'top' : 'bottom'
    setSide(next)
  }, [open, spaceAbove, fixedToTop, isPip])

  useEffect(() => {
    if (isPip) {
      setSide('top')
      return
    }
    if (fixedToTop) {
      setSide('bottom')
      return
    }
    if (side === 'top' && spaceAbove < lowerThreshold) {
      setSide('bottom')
      return
    }
    if (side === 'bottom' && spaceAbove > upperThreshold) {
      setSide('top')
    }
  }, [fixedToTop, lowerThreshold, side, spaceAbove, upperThreshold, isPip])

  const isTop = fixedToTop ? false : side === 'top'
  const top = isTop
    ? frame.y - CONTROLS_BAR_HEIGHT_PX - CONTROLS_BAR_GAP_PX
    : frame.y + frame.height + CONTROLS_BAR_GAP_PX
  const yOffset = isTop ? 14 : -14
  const rotateStart = isTop ? 76 : -76
  const origin = isTop ? 'bottom' : 'top'

  const portalEl =
    typeof document === 'undefined'
      ? null
      : isPip && pipWindow
        ? pipWindow.document.body
        : (document.getElementById('studio-portal') ?? document.body)

  if (!portalEl) return null

  return createPortal(
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className="pointer-events-auto fixed z-[75]"
          style={isPip ? {
            left: 20,
            right: 20,
            bottom: 20,
            perspective: 1200
          } : {
            left: frame.x,
            top,
            width: frame.width,
            perspective: 1200
          }}
          animate={isPip ? {} : { top }}
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
                  'relative flex h-[76px] items-stretch',
                  'divide-x divide-white/10'
                )}
              >
                <ControlCell
                  Thumb={SpeedThumb}
                  title={strings.speed}
                  value={speed}
                  min={10}
                  max={180}
                  step={1}
                  formatValue={(v) => `${Math.round(v)}`}
                  onChange={onSpeedChange}
                />
                <ControlCell
                  Thumb={TextSizeThumb}
                  title={strings.textSize}
                  value={fontSize}
                  min={22}
                  max={72}
                  step={1}
                  formatValue={(v) => `${Math.round(v)}px`}
                  onChange={onFontSizeChange}
                />
                <ControlCell
                  Thumb={OpacityThumb}
                  title={strings.opacity}
                  value={opacity}
                  min={0.15}
                  max={0.95}
                  step={0.01}
                  formatValue={(v) => `${Math.round(v * 100)}%`}
                  onChange={onOpacityChange}
                  disabled={isPip}
                />

                <div className="flex items-center justify-center gap-1.5 px-3">
                  <Tooltip label={strings.alignLeft}>
                    <button
                      type="button"
                      onClick={() => onTextAlignChange('left')}
                      aria-label={strings.alignLeft}
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors outline-none',
                        textAlign === 'left'
                          ? (isPip ? 'border-white/12 bg-white/6 text-white/90' : 'border-white/18 bg-white/10 text-white')
                          : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/8'
                      )}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip label={strings.alignCenter}>
                    <button
                      type="button"
                      onClick={() => onTextAlignChange('center')}
                      aria-label={strings.alignCenter}
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors outline-none',
                        textAlign === 'center'
                          ? (isPip ? 'border-white/12 bg-white/6 text-white/90' : 'border-white/18 bg-white/10 text-white')
                          : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/8'
                      )}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip label={strings.alignRight}>
                    <button
                      type="button"
                      onClick={() => onTextAlignChange('right')}
                      aria-label={strings.alignRight}
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors outline-none',
                        textAlign === 'right'
                          ? (isPip ? 'border-white/12 bg-white/6 text-white/90' : 'border-white/18 bg-white/10 text-white')
                          : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/8'
                      )}
                    >
                      <AlignRight className="h-4 w-4" />
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
    markdownEnabled,
    speed,
    fontSize,
    textAlign,
    playing,
    fixedToTop,
    onFrameChange,
    onOpacityChange,
    onSpeedChange,
    onFontSizeChange,
    onTextAlignChange,
    onFixedToTopChange,
    onTogglePlaying,
    onClose,
    onControlsOpenChange,
    onPipChange,
    forceCloseControls
  } = props

  const tooltip = useTooltipController()
  const { strings } = useI18n()
  const [quickOpen, setQuickOpen] = useState(false)
  const [isPip, setIsPip] = useState(false)
  const pipWindowRef = useRef<any>(null)
  const originalPositionRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (forceCloseControls && quickOpen) {
      setQuickOpen(false)
      onControlsOpenChange?.(false)
    }
  }, [forceCloseControls, quickOpen, onControlsOpenChange])

  // Handle PiP exit
  useEffect(() => {
    return () => {
      if (pipWindowRef.current) {
        pipWindowRef.current.close()
      }
    }
  }, [])

  const togglePip = useCallback(async () => {
    if (isPip) {
      pipWindowRef.current?.close()
      return
    }

    try {
      // @ts-ignore - Document Picture-in-Picture is a newer API
      const pip = await window.documentPictureInPicture.requestWindow({
        width: frame.width,
        height: frame.height + 60, // Add some room for header/controls
      })

      // Copy styles to PiP window
      const styleSheets = Array.from(document.styleSheets)
      styleSheets.forEach((styleSheet) => {
        try {
          const cssRules = Array.from(styleSheet.cssRules)
            .map((rule) => rule.cssText)
            .join('')
          const style = document.createElement('style')
          style.textContent = cssRules
          pip.document.head.appendChild(style)
        } catch (e) {
          // Cross-origin stylesheets will fail to read cssRules
          if (styleSheet.href) {
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = styleSheet.href
            pip.document.head.appendChild(link)
          }
        }
      })

      // Add a dark background to PiP window
      pip.document.body.style.backgroundColor = 'black'
      pip.document.body.style.margin = '0'
      pip.document.body.style.overflow = 'hidden'

      pipWindowRef.current = pip
      setIsPip(true)
      props.onPipChange?.(true)

      pip.addEventListener('pagehide', () => {
        setIsPip(false)
        props.onPipChange?.(false)
        pipWindowRef.current = null
      })
    } catch (e) {
      console.error('Failed to enter PiP:', e)
      alert('Picture-in-Picture failed. Make sure you are using a supported browser (Chrome 116+).')
    }
  }, [isPip, frame.width, frame.height, props.onPipChange])

  // Sync hotkeys to PiP window
  useEffect(() => {
    if (isPip && pipWindowRef.current) {
      const handleKeyDown = (e: any) => {
        if (e.code === 'Space') {
          e.preventDefault()
          onTogglePlaying()
        } else if (e.code === 'KeyP') {
          togglePip()
        } else if (e.code === 'KeyM') {
          props.onMarkdownEnabledChange?.(!markdownEnabled)
        } else if (e.code === 'KeyC') {
          setQuickOpen((prev) => {
            const next = !prev
            props.onControlsOpenChange?.(next)
            return next
          })
        }
      }
      pipWindowRef.current.addEventListener('keydown', handleKeyDown)
      return () => pipWindowRef.current?.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPip, onTogglePlaying, onClose, togglePip, markdownEnabled, props.onMarkdownEnabledChange])
  const [resizing, setResizing] = useState(false)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const wasOpenRef = useRef(open)
  const savedScrollTopRef = useRef<number>(0)

  const displayScript = useMemo(() => {
    if (isPip) {
      if (!script.trim()) return strings.pipEditHint

      const isDefault = Object.values(STRINGS).some((s) => s.defaultScript === script)
      if (isDefault) {
        const lines = script.split('\n')
        const firstLine = lines[0] || ''
        const rest = lines.slice(1).join('\n').trim()
        return `${firstLine}\n\n${strings.pipEditHint}\n\n${rest}`
      }
    }
    return script
  }, [isPip, script, strings.pipEditHint])

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

  const drag = usePointerDrag({
    enabled: open,
    getOrigin: () => ({ x: frame.x, y: frame.y }),
    onMove: (next) => {
      if (fixedToTop) {
        onFrameChange({ x: next.x, y: 0 })
      } else {
        onFrameChange({ x: next.x, y: next.y })
      }
    },
    onEnd: () => tooltip.unlock(DRAG_TOOLTIP_ID)
  })

  const minWidth = Math.max(PROMPTER_MIN_WIDTH, PROMPTER_CONTROLS_MIN_WIDTH)
  const resize = usePointerResize({
    enabled: open && !fixedToTop && !isPip,
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
      if (event.button !== 0 || isPip) return
      setResizing(true)
      resize.onPointerDown(event)
    },
    [resize]
  )

  const onFixToTop = useCallback(() => {
    originalPositionRef.current = { x: frame.x, y: frame.y }
    onFixedToTopChange(true)
    onFrameChange({ y: 0 })
  }, [frame.x, frame.y, onFrameChange, onFixedToTopChange])

  const onUnfixFromTop = useCallback(() => {
    onFixedToTopChange(false)
    if (originalPositionRef.current) {
      onFrameChange(originalPositionRef.current)
      originalPositionRef.current = null
    }
  }, [onFrameChange, onFixedToTopChange])

  useHotkeys(
    useMemo(
      () => ({
        c: () => {
          setQuickOpen((prev) => {
            const next = !prev
            onControlsOpenChange?.(next)
            return next
          })
        },
        y: () => {
          if (isPip) return
          if (fixedToTop) {
            onUnfixFromTop()
          } else {
            onFixToTop()
          }
        },
        space: () => onTogglePlaying(),
        escape: () => {
          if (!playing) return
          onTogglePlaying()
        },
        p: () => togglePip()
      }),
      [onTogglePlaying, playing, onControlsOpenChange, fixedToTop, onFixToTop, onUnfixFromTop, togglePip]
    ),
    open
  )

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      // Save scroll position when hiding
      const el = scrollerRef.current
      if (el) {
        savedScrollTopRef.current = el.scrollTop
      }
      tooltip.clear()
      setResizing(false)
      setQuickOpen(false)
      onControlsOpenChange?.(false)
    } else if (!wasOpenRef.current && open) {
      // Restore scroll position when showing
      const el = scrollerRef.current
      if (el) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          el.scrollTop = savedScrollTopRef.current
        })
      }
    }
    wasOpenRef.current = open
  }, [open, tooltip, onControlsOpenChange])

  useEffect(() => {
    if (fixedToTop && frame.y !== 0) {
      onFrameChange({ y: 0 })
    }
  }, [fixedToTop, frame.y, onFrameChange])

  return createPortal(
    <AnimatePresence>
      {open && (
        <TooltipProvider enabled={!isPip}>
          <motion.div
            key={isPip ? 'pip' : 'normal'}
            className={cn(
              'fixed z-[65] overflow-hidden flex flex-col pointer-events-auto',
              isPip
                ? 'rounded-none border-none shadow-none'
                : cn('border border-white/10 shadow-glow', fixedToTop ? 'rounded-b-2xl' : 'rounded-2xl')
            )}
            style={{
              width: isPip ? '100vw' : frame.width,
              height: isPip ? '100vh' : frame.height,
              x: isPip ? 0 : frame.x,
              y: isPip ? 0 : (fixedToTop ? 0 : frame.y),
              backgroundColor: `rgba(0,0,0,${opacity})`
            }}
            initial={{ opacity: 0, scale: isPip ? 1 : 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: isPip ? 1 : 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 40, mass: 0.8 }}
          >
            {fixedToTop && !isPip && (
              <div className="h-px w-full bg-white/10" />
            )}

            {(!fixedToTop || isPip) && (
              <div
                className={cn(
                  'flex items-center justify-between gap-2 px-4 text-white/85',
                  !isPip && 'border-b border-white/10',
                  'cursor-grab active:cursor-grabbing select-none touch-none'
                )}
                style={{ height: PROMPTER_HEADER_HEIGHT_PX }}
                onPointerDown={drag.onPointerDown}
              >
                <Tooltip label={strings.hidePrompter} shortcut="H">
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={strings.hidePrompter}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={cn(
                      'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70 outline-none',
                      'hover:bg-white/10 hover:text-white',
                      isPip && 'opacity-40 cursor-not-allowed pointer-events-none'
                    )}
                    disabled={isPip}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </Tooltip>
                <div className="flex items-center gap-1">
                  {isPip && (
                    <Tooltip label={playing ? strings.pausePrompter : strings.playPrompter} shortcut="Space">
                      <button
                        type="button"
                        onClick={onTogglePlaying}
                        aria-label={playing ? strings.pausePrompter : strings.playPrompter}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={cn(
                          'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70 outline-none',
                          'hover:bg-white/10 hover:text-white',
                          playing && (isPip ? 'border-white/12 bg-white/6 text-white/90' : 'border-white/18 bg-white/10 text-white')
                        )}
                      >
                        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip label={strings.fixToTop} shortcut="Y">
                    <button
                      type="button"
                      onClick={onFixToTop}
                      aria-label={strings.fixToTop}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70 outline-none',
                        'hover:bg-white/10 hover:text-white',
                        isPip && 'opacity-40 cursor-not-allowed pointer-events-none'
                      )}
                      disabled={isPip}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip label={strings.controls} shortcut="C">
                    <button
                      type="button"
                      onClick={() => {
                        setQuickOpen((v) => {
                          const next = !v
                          onControlsOpenChange?.(next)
                          return next
                        })
                      }}
                      aria-label="Prompter controls"
                      onPointerDown={(e) => e.stopPropagation()}
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70 outline-none',
                        'hover:bg-white/10 hover:text-white',
                        quickOpen && (isPip ? 'border-white/12 bg-white/6 text-white/90' : 'border-white/18 bg-white/10 text-white')
                      )}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  {(() => {
                    const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
                    const label = isSafari ? strings.popOutOnlyChrome : (isPip ? strings.popInPrompter : strings.popOutPrompter)

                    return (
                      <Tooltip label={label} shortcut={isSafari ? undefined : "P"}>
                        <button
                          type="button"
                          onClick={isSafari ? undefined : togglePip}
                          aria-label={label}
                          onPointerDown={(e) => e.stopPropagation()}
                          className={cn(
                            'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70 outline-none',
                            'hover:bg-white/10 hover:text-white',
                            isPip && (isPip ? 'border-white/12 bg-white/6 text-white/90' : 'border-white/18 bg-white/10 text-white'),
                            isSafari && 'opacity-40 cursor-not-allowed'
                          )}
                          disabled={isSafari}
                        >
                          {isPip ? <MonitorUp className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                        </button>
                      </Tooltip>
                    )
                  })()}
                  <Tooltip label={strings.drag} tooltipId={DRAG_TOOLTIP_ID}>
                    <span
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6',
                        isPip && 'opacity-40 cursor-not-allowed pointer-events-none'
                      )}
                      onPointerDown={() => !isPip && tooltip.lock(DRAG_TOOLTIP_ID)}
                    >
                      <Move className="h-4 w-4 text-white/60" />
                    </span>
                  </Tooltip>
                </div>
              </div>
            )}

            <div className="relative flex-1">
              <div
                ref={scrollerRef}
                className={cn('tele-scroll absolute left-0 top-0 right-0 z-10 overflow-y-auto select-none')}
                style={{ bottom: isPip ? 0 : (fixedToTop ? PROMPTER_HEADER_HEIGHT_PX : SCROLLBAR_BOTTOM_GUTTER_PX) }}
              >
                <div
                  className="px-6 text-white/92 select-none transition-[padding] duration-500 ease-in-out"
                  style={{
                    textAlign,
                    paddingTop: fixedToTop ? 8 : 24,
                    paddingBottom: playing ? frame.height * 0.7 : 24
                  }}
                >
                  {markdownEnabled ? (
                    <div
                      className="font-medium leading-[1.35] tracking-[-0.02em]"
                      style={{ fontSize }}
                    >
                      {renderMarkdownBlocks(displayScript)}
                    </div>
                  ) : (
                    <pre
                      className="whitespace-pre-wrap font-medium leading-[1.35] tracking-[-0.02em]"
                      style={{ fontSize }}
                    >
                      {displayScript}
                    </pre>
                  )}
                </div>
              </div>

              {!fixedToTop && (
                <div
                  aria-hidden="true"
                  className={cn(
                    'grip-visual absolute z-0',
                    isPip ? 'hidden' : (resizing && 'is-active')
                  )}
                  style={{
                    right: GRIP_INSET_PX,
                    bottom: GRIP_INSET_PX,
                    width: GRIP_VISUAL_SIZE_PX,
                    height: GRIP_VISUAL_SIZE_PX
                  }}
                />
              )}
            </div>

            {fixedToTop && !isPip && (
              <div
                className={cn(
                  'flex items-center justify-between gap-2 border-t border-white/10 px-4 text-white/85',
                  'cursor-grab active:cursor-grabbing select-none touch-none relative'
                )}
                style={{ height: PROMPTER_HEADER_HEIGHT_PX }}
                onPointerDown={drag.onPointerDown}
              >
                <Tooltip label={strings.hidePrompter} shortcut="H">
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={strings.hidePrompter}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={cn(
                      'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70 outline-none',
                      'hover:bg-white/10 hover:text-white',
                      isPip && 'opacity-40 cursor-not-allowed pointer-events-none'
                    )}
                    disabled={isPip}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </Tooltip>
                <div className="flex items-center gap-1">
                  {isPip && (
                    <Tooltip label={playing ? strings.pausePrompter : strings.playPrompter} shortcut="Space">
                      <button
                        type="button"
                        onClick={onTogglePlaying}
                        aria-label={playing ? strings.pausePrompter : strings.playPrompter}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={cn(
                          'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70 outline-none',
                          'hover:bg-white/10 hover:text-white',
                          playing && 'border-white/18 bg-white/10 text-white'
                        )}
                      >
                        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip label={strings.unfixFromTop} shortcut="Y">
                    <button
                      type="button"
                      onClick={onUnfixFromTop}
                      aria-label={strings.unfixFromTop}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70 outline-none',
                        'hover:bg-white/10 hover:text-white',
                        isPip && 'opacity-40 cursor-not-allowed pointer-events-none'
                      )}
                      disabled={isPip}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip label={strings.controls} shortcut="C">
                    <button
                      type="button"
                      onClick={() => {
                        setQuickOpen((v) => {
                          const next = !v
                          onControlsOpenChange?.(next)
                          return next
                        })
                      }}
                      aria-label="Prompter controls"
                      onPointerDown={(e) => e.stopPropagation()}
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70 outline-none',
                        'hover:bg-white/10 hover:text-white',
                        quickOpen && 'border-white/18 bg-white/10 text-white'
                      )}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  {(() => {
                    const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
                    const label = isSafari ? strings.popOutOnlyChrome : (isPip ? strings.popInPrompter : strings.popOutPrompter)

                    return (
                      <Tooltip label={label} shortcut={isSafari ? undefined : "P"}>
                        <button
                          type="button"
                          onClick={isSafari ? undefined : togglePip}
                          aria-label={label}
                          onPointerDown={(e) => e.stopPropagation()}
                          className={cn(
                            'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70 outline-none',
                            'hover:bg-white/10 hover:text-white',
                            isPip && 'border-white/18 bg-white/10 text-white',
                            isSafari && 'opacity-40 cursor-not-allowed'
                          )}
                          disabled={isSafari}
                        >
                          {isPip ? <MonitorUp className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                        </button>
                      </Tooltip>
                    )
                  })()}
                  <Tooltip label={strings.drag} tooltipId={DRAG_TOOLTIP_ID}>
                    <span
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/6',
                        isPip && 'opacity-40 cursor-not-allowed pointer-events-none'
                      )}
                      onPointerDown={() => !isPip && tooltip.lock(DRAG_TOOLTIP_ID)}
                    >
                      <Move className="h-4 w-4 text-white/60" />
                    </span>
                  </Tooltip>
                </div>
              </div>
            )}

            {!fixedToTop && (
              <div
                className={cn(
                  'grip-hit absolute z-20 touch-none',
                  !isPip && 'cursor-nwse-resize'
                )}
                style={{
                  right: GRIP_INSET_PX,
                  bottom: GRIP_INSET_PX,
                  width: GRIP_HIT_SIZE_PX,
                  height: GRIP_HIT_SIZE_PX
                }}
                onPointerDown={onResizePointerDown}
              />
            )}

            <ControlsBarPortal
              open={quickOpen}
              frame={frame}
              opacity={opacity}
              speed={speed}
              fontSize={fontSize}
              textAlign={textAlign}
              fixedToTop={fixedToTop}
              onOpacityChange={onOpacityChange}
              onSpeedChange={onSpeedChange}
              onFontSizeChange={onFontSizeChange}
              onTextAlignChange={onTextAlignChange}
              isPip={isPip}
              pipWindow={pipWindowRef.current}
            />
          </motion.div>
        </TooltipProvider>
      )}
    </AnimatePresence>,
    isPip && pipWindowRef.current ? pipWindowRef.current.document.body : (document.getElementById('studio-portal') || document.body)
  )
}
