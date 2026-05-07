import { useCallback, useEffect, useId, useMemo, useRef, useState, useLayoutEffect, Fragment } from 'react'
import type { ComponentType, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, BetweenHorizontalStart, Check, Eye, MonitorUp, Move, Pause, Play, PictureInPicture, SlidersHorizontal, X } from 'lucide-react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { cn } from '../../lib/cn'
import { Tooltip, TooltipProvider } from '../../components/Tooltip'
import { useTooltipController } from '../../components/useTooltipController'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useRafLoop } from '../../hooks/useRafLoop'
import { usePointerDrag } from '../../hooks/usePointerDrag'
import { usePointerResize } from '../../hooks/usePointerResize'
import { PrompterBarCountdown, PROMPTER_TIMER_HOTKEY_EVENT } from './PrompterBarCountdown'
import { PROMPTER_CONTROLS_MIN_WIDTH, PROMPTER_MIN_HEIGHT, PROMPTER_MIN_WIDTH, type PrompterFrame } from './types'
import { useI18n, STRINGS } from './i18n'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { extractWords, matchAsrToLine, tokenizeLine, calculateTokenFrequency, type WordInfo, type LineMatchState } from '../../lib/textMatching'
import { calculateWordTimings, type WordTiming } from '../../lib/wordTiming'

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
  onScriptChange: (value: string) => void
  autoScrollEnabled: boolean
  onAutoScrollChange: (value: boolean) => void
  wpm: number
  onWpmChange: (value: number) => void
  forceCloseControls?: boolean
}

const GRIP_HIT_SIZE_PX = 32
const GRIP_INSET_PX = 10
const GRIP_FIXED_EDGE_WIDTH_PX = 14 
const GRIP_VISUAL_SIZE_PX = 38
const SCROLLBAR_BOTTOM_GUTTER_PX = GRIP_INSET_PX + GRIP_VISUAL_SIZE_PX + 6
const CONTROLS_BAR_GAP_PX = 10
const CONTROLS_BAR_MIN_MARGIN_PX = 12
const CONTROLS_BAR_HEIGHT_PX = 76
const PROMPTER_HEADER_HEIGHT_PX = 52
const DRAG_TOOLTIP_ID = 'studio-prompter-drag'
const VOICE_FOLLOW_INDICATOR_ICON_SIZE = 'h-2 w-2'

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

// Tokenizer: bold spans, italic spans, runs of non-* text, or a lone * (unmatched)
const INLINE_TOKEN_RE = /\B\*\*[^*]+\*\*\B|\B\*[^*]+\*\B|[^*]+|\*/g

function renderInlineMarkdown(
  text: string,
  startWordIdx: number,
  spokenIndices: Set<number>,
  isPip: boolean,
  onWordClick?: (wordIdx: number) => void,
  isVoiceActive?: boolean
): { nodes: ReactNode[]; endWordIdx: number } {
  let wordIdx = startWordIdx
  const nodes: ReactNode[] = []

  const getWordClass = (idx: number) => {
    if (!spokenIndices.has(idx)) return isPip ? 'text-white/92' : ''
    return isPip ? 'text-[#666]' : 'opacity-40'
  }

  const renderWords = (raw: string, key: string) =>
    raw.split(/(\s+)/).map((token, i) => {
      if (/\s+/.test(token)) return <Fragment key={`${key}-sp-${i}`}>{token}</Fragment>
      if (!/\w/.test(token)) {
        const prevIdx = wordIdx - 1
        return <span key={`${key}-p-${i}`} className={prevIdx >= 0 ? getWordClass(prevIdx) : ''}>{token}</span>
      }
      const currentIdx = wordIdx++
      return (
        <span
          key={`${key}-w-${i}`}
          data-word-idx={currentIdx}
          className={getWordClass(currentIdx)}
          onClick={(e) => {
            if (isVoiceActive && onWordClick) {
              e.stopPropagation()
              onWordClick(currentIdx)
            }
          }}
          style={isVoiceActive ? { cursor: 'pointer' } : undefined}
        >
          {token}
        </span>
      )
    })

  const tokens = [...text.matchAll(INLINE_TOKEN_RE)]
  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx]?.[0] ?? ''
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(<strong key={`bold-${idx}`} className="font-semibold text-white/95">{renderWords(token.slice(2, -2), `bold-${idx}`)}</strong>)
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 1) {
      nodes.push(<em key={`em-${idx}`} className="text-white/90">{renderWords(token.slice(1, -1), `em-${idx}`)}</em>)
    } else {
      nodes.push(<span key={`text-${idx}`}>{renderWords(token, `text-${idx}`)}</span>)
    }
  }

  return { nodes, endWordIdx: wordIdx }
}

function renderMarkdownBlocks(
  text: string,
  spokenIndices: Set<number>,
  isPip: boolean,
  onWordClick?: (wordIdx: number) => void,
  isVoiceActive?: boolean
): ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let wordIdx = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (line.trim() === '') {
      blocks.push(<div key={`spacer-${i}`} style={{ height: '1.35em' }} />)
      i += 1
      continue
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line)
    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 1
      const textContent = headingMatch[2] ?? ''
      const headingClass = cn(
        'font-semibold tracking-[-0.02em] text-white',
        level === 1 && 'text-[1.45em] leading-[1.2]',
        level === 2 && 'text-[1.25em] leading-[1.25]',
        level === 3 && 'text-[1.1em] leading-[1.3]',
        level > 3 && 'text-[1em] leading-[1.35]'
      )
      const result = renderInlineMarkdown(textContent, wordIdx, spokenIndices, isPip, onWordClick, isVoiceActive)
      wordIdx = result.endWordIdx

      if (level === 1) {
        blocks.push(
          <h1 key={`h-${i}`} className={headingClass}>
            {result.nodes}
          </h1>
        )
      } else if (level === 2) {
        blocks.push(
          <h2 key={`h-${i}`} className={headingClass}>
            {result.nodes}
          </h2>
        )
      } else if (level === 3) {
        blocks.push(
          <h3 key={`h-${i}`} className={headingClass}>
            {result.nodes}
          </h3>
        )
      } else if (level === 4) {
        blocks.push(
          <h4 key={`h-${i}`} className={headingClass}>
            {result.nodes}
          </h4>
        )
      } else if (level === 5) {
        blocks.push(
          <h5 key={`h-${i}`} className={headingClass}>
            {result.nodes}
          </h5>
        )
      } else {
        blocks.push(
          <h6 key={`h-${i}`} className={headingClass}>
            {result.nodes}
          </h6>
        )
      }
      i += 1
      continue
    }

    const paragraphLines: string[] = []
    while (i < lines.length && (lines[i] ?? '').trim() !== '') {
      const currentLine = lines[i] ?? ''
      if (/^(#{1,6})\s+/.test(currentLine)) break
      paragraphLines.push(currentLine)
      i += 1
    }
    const paragraphText = paragraphLines.join('\n')
    const paragraphParts = paragraphText.split('\n')
    blocks.push(
      <p key={`p-${i}`} className="text-white/92">
        {paragraphParts.map((segment, idx) => {
          const result = renderInlineMarkdown(segment, wordIdx, spokenIndices, isPip, onWordClick, isVoiceActive)
          wordIdx = result.endWordIdx
          return (
            <span key={`p-${i}-${idx}`}>
              {result.nodes}
              {idx < paragraphParts.length - 1 && <br />}
            </span>
          )
        })}
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
  disabled,
  inputMultiplier = 1,
  suffix,
  disabledTooltip
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
  inputMultiplier?: number
  suffix?: string
  disabledTooltip?: string
}) {
  // Opacity for disabled controls—consistent visual feedback across slider, track, and text
  const DISABLED_OPACITY = 'opacity-35'
  const rangeInputRef = useRef<HTMLInputElement | null>(null)
  const textInputRef = useRef<HTMLInputElement | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

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

  useEffect(() => {
    if (isEditing) {
      textInputRef.current?.focus()
      textInputRef.current?.select()
    }
  }, [isEditing])

  const startEditing = useCallback(() => {
    if (disabled) return
    setIsEditing(true)
    setEditValue(Math.round(value * inputMultiplier).toString())
  }, [disabled, value, inputMultiplier])

  const commitEditing = useCallback(() => {
    setIsEditing(false)
    const nextText = editValue.trim().replace(/[^0-9.]/g, '')
    if (!nextText) return

    const nextRaw = parseFloat(nextText)
    if (isNaN(nextRaw)) return

    const nextScaled = nextRaw / inputMultiplier
    // Validation & clamping
    const clamped = Math.min(max, Math.max(min, nextScaled))
    // Step rounding
    const stepped = Math.round((clamped - min) / step) * step + min
    const fixed = Number(stepped.toFixed(decimals))
    onChange(fixed)
  }, [editValue, inputMultiplier, max, min, step, decimals, onChange])

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
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <Tooltip enabled={disabled && !!disabledTooltip} label={disabledTooltip || ''}>
        <div className="flex h-full min-w-0 flex-1 flex-col px-4 pt-4 pb-2">
        <div className={cn("flex items-end justify-between gap-3", disabled && DISABLED_OPACITY)}>
          <div className="truncate text-[13px] font-medium leading-none text-white/70">{title}</div>
        {isEditing ? (
          <div className="flex items-center justify-end">
            <input
              ref={textInputRef}
              autoFocus
              onFocus={(e) => e.target.select()}
              type="text"
              inputMode="decimal"
              // text-white/55 to match baseline, caret-white to keep cursor visible
              className="w-9 min-w-0 h-[13px] appearance-none bg-transparent p-0 m-0 text-right text-[13px] font-medium leading-none tabular-nums text-white/55 caret-white outline-none placeholder:text-white/30"
              value={editValue}
              onChange={(e) => {
                const val = e.target.value
                // Allow only digits and at most one decimal point
                if (/^\d*\.?\d*$/.test(val)) {
                  setEditValue(val)
                }
              }}
              onBlur={commitEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEditing()
                if (e.key === 'Escape') setIsEditing(false)
              }}
            />
            {suffix && (
              <span className="text-[13px] font-medium leading-none text-white/55 tabular-nums">
                {suffix}
              </span>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            disabled={disabled}
            className="shrink-0 tabular-nums text-[13px] font-medium leading-none text-white/55 hover:text-white/80 disabled:hover:text-white/55 transition-colors outline-none cursor-text disabled:cursor-default"
          >
            {formatValue ? formatValue(value) : `${value}`}
          </button>
        )}
      </div>

      <div className={cn("relative mt-2.5 h-9", disabled && "pointer-events-none")}>
        <div
          className={cn(
            'relative mx-4 h-full touch-none select-none',
            'cursor-pointer outline-none',
            disabled && DISABLED_OPACITY
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
            ref={rangeInputRef}
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
      </Tooltip>
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
  autoScrollEnabled,
  wpm,
  playing,
  onAutoScrollChange,
  onOpacityChange,
  onSpeedChange,
  onWpmChange,
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
  autoScrollEnabled: boolean
  wpm: number
  playing: boolean
  onAutoScrollChange: (value: boolean) => void
  onOpacityChange: (value: number) => void
  onSpeedChange: (value: number) => void
  onWpmChange: (value: number) => void
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
          className="pointer-events-auto fixed z-50"
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
                  title={autoScrollEnabled ? strings.autoScrollSpeed : strings.speed}
                  value={autoScrollEnabled ? wpm : speed}
                  min={autoScrollEnabled ? 100 : 20}
                  max={autoScrollEnabled ? 300 : 60}
                  step={autoScrollEnabled ? 5 : 1}
                  formatValue={(v) => `${Math.round(v)}`}
                  onChange={autoScrollEnabled ? onWpmChange : onSpeedChange}
                  disabled={false}
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
                  suffix="px"
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
                  inputMultiplier={100}
                  suffix="%"
                />

                <div className="flex items-center justify-center gap-1.5 px-3">
                  <Tooltip enabled={!isPip} label={strings.alignLeft}>
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
                  <Tooltip enabled={!isPip} label={strings.alignCenter}>
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
                  <Tooltip enabled={!isPip} label={strings.alignRight}>
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
    onScriptChange,
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
    onMarkdownEnabledChange,
    autoScrollEnabled,
    onAutoScrollChange,
    wpm,
    onWpmChange,
    forceCloseControls,
  } = props

  const tooltip = useTooltipController()
  const { strings } = useI18n()
  const [quickOpen, setQuickOpen] = useState(false)
  const [isPip, setIsPip] = useState(false)

  // Timer state lifted here so it survives PiP transitions (portal re-mounts into a different window)
  const [timerBudgetMs, setTimerBudgetMs] = useState<number | null>(null)
  const [timerRemainingMs, setTimerRemainingMs] = useState(0)
  const [timerWantsRun, setTimerWantsRun] = useState(false)
  const pipWindowRef = useRef<any>(null)
  const originalPositionRef = useRef<{ x: number; y: number } | null>(null)

  // Scrollbar state
  const [scrollbarThumbPosition, setScrollbarThumbPosition] = useState(0)
  const [scrollbarThumbHeight, setScrollbarThumbHeight] = useState(0.2) // 0-1, proportion of track
  const scrollbarTrackRef = useRef<HTMLDivElement>(null)
  const scrollbarThumbRef = useRef<HTMLDivElement>(null)
  const isDraggingScrollbarRef = useRef(false)
  const [hasTransitionRef] = useState(() => ({ enabled: false })) // Track if transition should be active

  // Speech recognition state
  const [spokenWordIndices, setSpokenWordIndices] = useState<Set<number>>(new Set())
  const currentLineIndexRef = useRef(0) // 0-indexed: first line is 0, second line is 1, etc.
  const scriptWordsRef = useRef<WordInfo[]>([])
  const scriptLinesRef = useRef<number[][]>([]) // 0-indexed: Each sub-array contains word indices for that line

  // Buffer-based matching state
  const currentLineTokensRef = useRef<string[]>([]) // Normalized tokens for current line
  const lineMatchStateRef = useRef<LineMatchState>({
    gtIndex: 0,
    processedAsrIndex: 0,
    highlightIndices: []
  })
  const finalizedBufferRef = useRef<string>('') // Finalized ASR text (from isFinal=true)
  const lastInterimTranscriptRef = useRef<string>('') // Last interim transcript to detect changes

  // Token frequency for dynamic weighting
  const tokenFrequencyMapRef = useRef<Map<string, number>>(new Map())
  const highFrequencyThresholdRef = useRef<number>(1)

  // Auto-scroll state machine
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0)
  const wordTimingsRef = useRef<WordTiming[]>([])
  const autoScrollTimeoutRef = useRef<number | null>(null)
  const autoScrollStartTimeRef = useRef<number>(0)
  const remainingTimeRef = useRef<number>(0)
  const previousLineIndexRef = useRef<number>(0)
  const prevAutoScrollEnabledRef = useRef(autoScrollEnabled)
  const wpmRef = useRef(wpm)
  wpmRef.current = wpm

  // Initialize script words when script changes — full reset
  useEffect(() => {
    scriptWordsRef.current = extractWords(script)

    // Calculate token frequency for dynamic weighting
    const allTokens = scriptWordsRef.current.map(w => w.normalizedWord)
    const { frequencyMap, highFrequencyThreshold } = calculateTokenFrequency(allTokens)
    tokenFrequencyMapRef.current = frequencyMap
    highFrequencyThresholdRef.current = highFrequencyThreshold

    // Calculate word timings for auto-scroll
    wordTimingsRef.current = calculateWordTimings(scriptWordsRef.current, wpmRef.current, script)

    setSpokenWordIndices(new Set())
    currentLineIndexRef.current = 0
    scriptLinesRef.current = []
    setCurrentWordIndex(0)
  }, [script])

  // WPM change: recalculate timings only — do NOT reset position or line map
  useEffect(() => {
    if (!scriptWordsRef.current.length) return
    wordTimingsRef.current = calculateWordTimings(scriptWordsRef.current, wpm, script)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wpm]) // script intentionally omitted — only wpm changes should trigger this

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
        const target = e.target as HTMLElement | null
        const isTypingTarget =
          target?.tagName === 'INPUT' ||
          target?.tagName === 'TEXTAREA' ||
          (target?.getAttribute('contenteditable') ?? 'false') === 'true'

        if (e.code === 'Space') {
          e.preventDefault()
          onTogglePlaying()
        } else if (e.code === 'KeyP') {
          if (isTypingTarget) return
          togglePip()
        } else if (e.code === 'KeyM') {
          if (isTypingTarget) return
          props.onMarkdownEnabledChange?.(!markdownEnabled)
        } else if (e.code === 'KeyC') {
          if (isTypingTarget) return
          setQuickOpen((prev) => {
            const next = !prev
            props.onControlsOpenChange?.(next)
            return next
          })
        } else if (e.code === 'KeyT') {
          if (isTypingTarget) return
          window.dispatchEvent(new CustomEvent(PROMPTER_TIMER_HOTKEY_EVENT))
        }
      }
      pipWindowRef.current.addEventListener('keydown', handleKeyDown)
      return () => pipWindowRef.current?.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPip, onTogglePlaying, onClose, togglePip, markdownEnabled, props.onMarkdownEnabledChange])
  const [resizing, setResizing] = useState(false)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const wasOpenRef = useRef(open)
  const savedScrollTopRef = useRef<number>(0)
  const virtualScrollYRef = useRef<number>(0)
  const [isEditing, setIsEditing] = useState(false)
  const cursorPositionRef = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Track if we just entered edit mode and last cursor position
  const prevIsEditingRef = useRef(isEditing)
  const lastCursorPositionRef = useRef<number>(0)
  useEffect(() => {
    prevIsEditingRef.current = isEditing
  })

  const scrollCursorIntoView = useCallback(() => {
    const textarea = textareaRef.current
    const scrollParent = scrollerRef.current
    const content = contentRef.current
    if (!textarea || !scrollParent || !content) return

    const cursor = textarea.selectionStart
    lastCursorPositionRef.current = cursor

    const style = window.getComputedStyle(textarea)
    const doc = textarea.ownerDocument
    const mirrorDiv = doc.createElement('div')

    const props = [
      'boxSizing', 'width', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
      'borderTopWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRightWidth',
      'fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'letterSpacing', 'lineHeight',
      'textAlign', 'textIndent', 'textTransform', 'whiteSpace', 'wordBreak', 'wordSpacing', 'overflowWrap'
    ]

    props.forEach((p: any) => {
      // @ts-ignore
      mirrorDiv.style[p] = style[p]
    })

    mirrorDiv.style.position = 'absolute'
    mirrorDiv.style.visibility = 'hidden'
    mirrorDiv.style.height = 'auto'
    mirrorDiv.style.top = '-9999px'
    mirrorDiv.style.left = '-9999px'

    mirrorDiv.textContent = textarea.value.substring(0, cursor)
    const span = doc.createElement('span')
    span.textContent = '|'
    mirrorDiv.appendChild(span)

    doc.body.appendChild(mirrorDiv)
    const cursorTop = span.offsetTop
    doc.body.removeChild(mirrorDiv)

    const contentPaddingTop = parseFloat(window.getComputedStyle(content).paddingTop) || 0
    const viewportHeight = scrollParent.clientHeight
    const lineHeight = parseFloat(style.lineHeight) || 20

    const absoluteCursorPosition = cursorTop + contentPaddingTop
    const targetScrollTop = absoluteCursorPosition - (viewportHeight / 2) + (lineHeight / 2)

    const maxScroll = Math.max(0, content.scrollHeight - scrollParent.clientHeight)
    const clampedScrollY = Math.max(0, Math.min(targetScrollTop, maxScroll))

    virtualScrollYRef.current = clampedScrollY
    content.style.transform = `translateY(-${clampedScrollY}px)`
  }, [])

  useLayoutEffect(() => {
    if (!isEditing || !textareaRef.current) return

    const textarea = textareaRef.current
    const justEnteredEditMode = !prevIsEditingRef.current && isEditing

    if (justEnteredEditMode) {
      textarea.focus()
      if (cursorPositionRef.current !== null) {
        textarea.setSelectionRange(cursorPositionRef.current, cursorPositionRef.current)
      }
    }

    scrollCursorIntoView()
  }, [isEditing, script, scrollCursorIntoView])

  // Allow editing even while playing (removed auto-exit)
  // useEffect(() => {
  //   if (playing) setIsEditing(false)
  // }, [playing])

  const displayScript = useMemo(() => {
    return script
  }, [script])

  // Scroll to show a specific line (by first word index)
  const scrollToLine = useCallback((firstWordIdx: number) => {
    const scroller = scrollerRef.current
    const content = contentRef.current
    if (!scroller || !content) return

    const doc = scroller.ownerDocument
    const wordSpan = doc.querySelector(`[data-word-idx="${firstWordIdx}"]`)
    if (!wordSpan) return

    // Use offsetTop for stable document position (not affected by transforms)
    const wordOffsetTop = (wordSpan as HTMLElement).offsetTop

    // Position current line at the top of viewport (small padding)
    // This ensures first line appears at very top, and subsequent lines scroll smoothly
    const readingPosition = 8 // Small padding from absolute top
    const targetScrollY = wordOffsetTop - readingPosition

    // Clamp to valid range
    const maxScroll = Math.max(0, content.scrollHeight - scroller.clientHeight)
    const clampedScrollY = Math.max(0, Math.min(targetScrollY, maxScroll))

    // Enable transition for auto-scroll line jumps, then disable after animation
    hasTransitionRef.enabled = true
    content.style.transition = 'transform 0.3s ease-out'

    // Update scroll position — CSS transition will animate the change
    virtualScrollYRef.current = clampedScrollY
    content.style.transform = `translateY(-${clampedScrollY}px)`

    // Disable transition after animation completes
    setTimeout(() => {
      content.style.transition = ''
      hasTransitionRef.enabled = false
    }, 300)
  }, [])

  // Detect lines from rendered DOM
  const detectLines = useCallback(() => {
    const el = scrollerRef.current
    if (!el) {
      // console.log('[FloatingPrompter] No scroller element for line detection')
      return
    }

    // console.log('[FloatingPrompter] Detecting lines from DOM...')

    // Get the actual document (might be PiP window)
    const doc = el.ownerDocument

    // Get all word spans
    const wordSpans = doc.querySelectorAll('[data-word-idx]')
    if (wordSpans.length === 0) {
      // console.log('[FloatingPrompter] No word spans found, will retry...')
      return
    }

    const lines: number[][] = []
    let currentLine: number[] = []
    let lastTop: number | null = null
    const LINE_THRESHOLD_PX = fontSize * 0.5

    wordSpans.forEach((span) => {
      const idx = parseInt(span.getAttribute('data-word-idx') ?? '-1', 10)
      if (idx === -1) return

      const rect = span.getBoundingClientRect()
      const top = rect.top

      // Check if this word is on a new line
      if (lastTop !== null && Math.abs(top - lastTop) > LINE_THRESHOLD_PX) {
        // New line detected
        if (currentLine.length > 0) {
          lines.push(currentLine)
        }
        currentLine = [idx]
      } else {
        // Same line
        currentLine.push(idx)
      }

      lastTop = top
    })

    // Add the last line
    if (currentLine.length > 0) {
      lines.push(currentLine)
    }

    scriptLinesRef.current = lines
    // console.log('[FloatingPrompter] Detected lines:', lines.length)
    // console.log('[FloatingPrompter] First 3 lines:', lines.slice(0, 3))
  }, [fontSize])

  // Detect lines after rendering (when script, fontSize, or frame size changes)
  // Use multiple strategies to ensure detection happens after DOM is ready
  useLayoutEffect(() => {
    // Skip detection while editing (textarea is shown instead of word spans)
    if (isEditing) {
      // console.log('[FloatingPrompter] Skipping line detection during edit mode')
      return
    }

    // Strategy 1: Immediate detection (works when DOM is already ready)
    detectLines()

    // Strategy 2: After browser paint (catches resize cases)
    requestAnimationFrame(() => {
      detectLines()
    })

    // Strategy 3: Small delay fallback (catches async rendering)
    const timeoutId = setTimeout(() => {
      detectLines()
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [detectLines, script, fontSize, frame.width, frame.height, isPip, isEditing])

  // Get first visible line index (0-indexed)
  const getFirstVisibleLineIndex = useCallback((): number => {
    const el = scrollerRef.current
    if (!el || scriptLinesRef.current.length === 0) return 0

    const doc = el.ownerDocument
    const containerRect = el.getBoundingClientRect()
    const containerTop = containerRect.top

    // Find first line where any word is visible (lineIdx is 0-indexed)
    for (let lineIdx = 0; lineIdx < scriptLinesRef.current.length; lineIdx++) {
      const line = scriptLinesRef.current[lineIdx]
      if (!line || line.length === 0) continue

      const firstWordIdx = line[0]
      if (firstWordIdx === undefined) continue

      const wordSpan = doc.querySelector(`[data-word-idx="${firstWordIdx}"]`)
      if (!wordSpan) continue

      const wordRect = wordSpan.getBoundingClientRect()
      if (wordRect.bottom > containerTop) {
        // console.log('[FloatingPrompter] First visible line index:', lineIdx)
        return lineIdx
      }
    }

    return 0
  }, [])

  // Initialize line matching state for a specific line (0-indexed)
  const initializeLineState = useCallback((lineIndex: number) => {
    const line = scriptLinesRef.current[lineIndex]
    if (!line) {
      // console.log('[FloatingPrompter] Cannot initialize line state - line not found:', lineIndex)
      return
    }

    // Tokenize the line once
    const lineTokens = tokenizeLine(scriptWordsRef.current, line)
    currentLineTokensRef.current = lineTokens

    // Reset matching state
    lineMatchStateRef.current = {
      gtIndex: 0,
      processedAsrIndex: 0,
      highlightIndices: []
    }

    // Reset buffers
    finalizedBufferRef.current = ''
    lastInterimTranscriptRef.current = ''

    // console.log('[FloatingPrompter] Initialized line', lineIndex, 'with', lineTokens.length, 'tokens:', lineTokens)
  }, [])

  // Helper to find line index containing a word
  const findLineIndexContainingWord = useCallback((wordIdx: number): number => {
    for (let i = 0; i < scriptLinesRef.current.length; i++) {
      const line = scriptLinesRef.current[i]
      if (line && line.includes(wordIdx)) {
        return i
      }
    }
    return 0
  }, [])

  // Helper to find first word of a line
  const findFirstWordOfLine = useCallback((lineIdx: number): number => {
    const line = scriptLinesRef.current[lineIdx]
    return line?.[0] ?? 0
  }, [])

  // Auto-scroll core: schedule next word
  const scheduleNextWord = useCallback(() => {
    if (!playing || !autoScrollEnabled) return

    const wordIdx = currentWordIndex
    const timing = wordTimingsRef.current[wordIdx]

    if (!timing || wordIdx >= scriptWordsRef.current.length) {
      // Reached end of script
      return
    }

    const delay = remainingTimeRef.current > 0
      ? remainingTimeRef.current
      : timing.durationMs

    autoScrollStartTimeRef.current = performance.now()
    autoScrollTimeoutRef.current = setTimeout(() => {
      // Check if this word is on a new line compared to previous
      const currentLineIdx = findLineIndexContainingWord(wordIdx)

      // Scroll to line if changed
      const shouldScroll = currentLineIdx !== previousLineIndexRef.current || wordIdx === 0
      if (shouldScroll) {
        const firstWordOfLine = findFirstWordOfLine(currentLineIdx)
        scrollToLine(firstWordOfLine)
        previousLineIndexRef.current = currentLineIdx
      }

      // Gray out current word
      setSpokenWordIndices(prev => new Set([...prev, wordIdx]))

      // Move to next word
      setCurrentWordIndex(prev => prev + 1)
      remainingTimeRef.current = 0
    }, delay)
  }, [playing, autoScrollEnabled, currentWordIndex, findLineIndexContainingWord, findFirstWordOfLine, scrollToLine])

  // Pause/Resume handling for auto-scroll
  useEffect(() => {
    // Clear any existing timeout first
    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current)
      autoScrollTimeoutRef.current = null
    }

    if (playing && autoScrollEnabled) {
      // Start/continue auto-scrolling
      scheduleNextWord()
    } else if (!playing && autoScrollEnabled) {
      // Reset to start when pausing
      setCurrentWordIndex(0)
      setSpokenWordIndices(new Set())
      remainingTimeRef.current = 0
      autoScrollStartTimeRef.current = 0
      previousLineIndexRef.current = 0
    }

    return () => {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current)
        autoScrollTimeoutRef.current = null
      }
    }
  }, [playing, autoScrollEnabled, currentWordIndex, scheduleNextWord])

  // Reset auto-scroll when disabled and pause if needed
  useEffect(() => {
    if (!autoScrollEnabled) {
      setCurrentWordIndex(0)
      setSpokenWordIndices(new Set())
      remainingTimeRef.current = 0
      autoScrollStartTimeRef.current = 0
      previousLineIndexRef.current = 0
      // Pause playback only when autoscroll is being turned OFF (transition from true to false)
      if (prevAutoScrollEnabledRef.current && playing) {
        onTogglePlaying()
      }
    }
    prevAutoScrollEnabledRef.current = autoScrollEnabled
  }, [autoScrollEnabled, playing, onTogglePlaying])

  // Auto-advance to next line (used by timeout and normal completion)
  const advanceToNextLine = useCallback(() => {
    const currentLineIdx = currentLineIndexRef.current
    const nextLineIdx = currentLineIdx + 1

    // console.log('[FloatingPrompter] Auto-advancing from line', currentLineIdx, 'to', nextLineIdx)

    if (nextLineIdx < scriptLinesRef.current.length) {
      currentLineIndexRef.current = nextLineIdx

      // Gray out completed line
      setSpokenWordIndices(prev => {
        const next = new Set(prev)
        const completedLine = scriptLinesRef.current[currentLineIdx]
        if (completedLine) {
          completedLine.forEach(idx => next.add(idx))
        }
        return next
      })

      // Initialize next line
      initializeLineState(nextLineIdx)

      // Scroll to next line
      const nextLine = scriptLinesRef.current[nextLineIdx]
      if (nextLine && nextLine.length > 0) {
        const firstWordIdx = nextLine[0]
        if (firstWordIdx !== undefined) {
          scrollToLine(firstWordIdx)
        }
      }
    } else {
      setSpokenWordIndices(prev => {
        const next = new Set(prev)
        const completedLine = scriptLinesRef.current[currentLineIdx]
        if (completedLine) {
          completedLine.forEach(idx => next.add(idx))
        }
        return next
      })
    }
  }, [scrollToLine, initializeLineState])

  // Initialize current line to first visible line when playing starts (for speech recognition)
  useEffect(() => {
    if (open && playing && autoScrollEnabled) {
      const firstVisibleLine = getFirstVisibleLineIndex()
      currentLineIndexRef.current = firstVisibleLine
      // console.log('[FloatingPrompter] Initialized current line to:', firstVisibleLine)

      // Initialize line matching state (for speech recognition enhancement)
      initializeLineState(firstVisibleLine)

      // Don't gray out previous lines - start fresh with no highlights
      // This ensures that after pausing and resuming, we start clean
    } else {
      // Clear highlighting when exiting auto-scroll mode or stopping playback
      if (!autoScrollEnabled) {
        setSpokenWordIndices(new Set())
      }
      // Reset line tracking so we start fresh on resume
      currentLineIndexRef.current = 0
    }
  }, [open, playing, autoScrollEnabled, getFirstVisibleLineIndex, initializeLineState])

  // Speech recognition integration
  const { locale } = useI18n()

  const handleTranscript = useCallback((transcript: string, isFinal: boolean) => {
    // console.log(`[FloatingPrompter] ========== ${isFinal ? 'FINAL' : 'INTERIM'} ==========`)
    // console.log('[FloatingPrompter] Transcript:', transcript)
    // console.log('[FloatingPrompter] Current line index:', currentLineIndexRef.current)

    const currentLineIdx = currentLineIndexRef.current
    const currentLine = scriptLinesRef.current[currentLineIdx]

    if (!currentLine || currentLine.length === 0) {
      // console.log('[FloatingPrompter] No current line or empty line')
      // console.log('[FloatingPrompter] =========================')
      return
    }

    // Build ASR buffer: finalized text + current transcript
    let asrBuffer: string
    if (isFinal) {
      // Lock in this transcript
      finalizedBufferRef.current += (finalizedBufferRef.current ? ' ' : '') + transcript
      asrBuffer = finalizedBufferRef.current
      lastInterimTranscriptRef.current = '' // Reset interim
      // console.log('[FloatingPrompter] FINAL - locked into buffer:', asrBuffer)
    } else {
      // Interim: combine finalized + current interim (don't lock in yet)
      asrBuffer = finalizedBufferRef.current + (finalizedBufferRef.current ? ' ' : '') + transcript
      lastInterimTranscriptRef.current = transcript
      // console.log('[FloatingPrompter] INTERIM - combined buffer:', asrBuffer)
    }

    // Get current line tokens
    const lineTokens = currentLineTokensRef.current
    if (lineTokens.length === 0) {
      // console.log('[FloatingPrompter] No line tokens - reinitializing line state')
      initializeLineState(currentLineIdx)
      // console.log('[FloatingPrompter] =========================')
      return
    }

    // console.log('[FloatingPrompter] Line tokens:', lineTokens)
    // console.log('[FloatingPrompter] Current state - gtIndex:', lineMatchStateRef.current.gtIndex, 'processedAsrIndex:', lineMatchStateRef.current.processedAsrIndex)

    // Get ONLY the immediate next line (i+1) for lookahead matching
    // SAFETY: Never look beyond i+1 to prevent multi-line jumps
    const nextLineIdx = currentLineIdx + 1
    const nextLine = scriptLinesRef.current[nextLineIdx]
    const nextLineTokens = nextLine ? tokenizeLine(scriptWordsRef.current, nextLine) : undefined

    // if (nextLineTokens) {
    //   console.log('[FloatingPrompter] Next line (i+1) tokens (first 3):', nextLineTokens.slice(0, 3))
    // }

    // Match ASR buffer against line tokens (with dynamic weighting and next line lookahead)
    const { newState, lineComplete } = matchAsrToLine(
      lineTokens,
      asrBuffer,
      lineMatchStateRef.current,
      tokenFrequencyMapRef.current,
      highFrequencyThresholdRef.current,
      nextLineTokens
    )

    // Update state
    lineMatchStateRef.current = newState
    // console.log('[FloatingPrompter] New state - gtIndex:', newState.gtIndex, 'highlightIndices:', newState.highlightIndices)
    // console.log('[FloatingPrompter] Line complete:', lineComplete)

    // Convert line-relative highlight indices to global word indices
    const globalHighlightIndices = newState.highlightIndices.map(lineRelativeIdx => {
      return currentLine[lineRelativeIdx]
    }).filter((idx): idx is number => idx !== undefined)

    // console.log('[FloatingPrompter] Global highlight indices:', globalHighlightIndices)

    // Update spoken indices for visual feedback
    setSpokenWordIndices(prev => {
      const next = new Set(prev)

      // Gray out all previous lines
      for (let i = 0; i < currentLineIdx; i++) {
        const line = scriptLinesRef.current[i]
        if (line) {
          line.forEach(idx => next.add(idx))
        }
      }

      // Add highlighted words from current line
      globalHighlightIndices.forEach(idx => next.add(idx))

      // console.log('[FloatingPrompter] Updated spokenWordIndices, size:', next.size)
      return next
    })

    // Advance to next line immediately when current line is complete
    // SAFETY: Only advance by 1 line at a time (i → i+1)
    if (lineComplete) {
      // console.log('[FloatingPrompter] Line complete! Advancing to next line')
      advanceToNextLine()

      // IMPORTANT: Return early after advancing to prevent processing more of this transcript
      // on the new line (which could cause immediate double-advancement)
      // console.log('[FloatingPrompter] =========================')
      return
    }

    // console.log('[FloatingPrompter] =========================')
  }, [scrollToLine, initializeLineState, advanceToNextLine])

  const handleError = useCallback((error: string) => {
    console.warn('Speech recognition error:', error)
  }, [])

  const speechRecognition = useSpeechRecognition({
    enabled: false,
    locale,
    onTranscript: handleTranscript,
    onError: handleError
  })

  // Find which line contains a given word index
  const findLineIndexForWord = useCallback((wordIndex: number): number | undefined => {
    for (let lineIdx = 0; lineIdx < scriptLinesRef.current.length; lineIdx++) {
      const line = scriptLinesRef.current[lineIdx]
      if (line && line.includes(wordIndex)) {
        return lineIdx
      }
    }
    return undefined
  }, [])

  // Handle word click during auto-scrolling
  const handleWordClick = useCallback((wordIndex: number) => {
    if (!autoScrollEnabled || !playing) return

    // console.log('[FloatingPrompter] Word clicked:', wordIndex)

    // Clear current auto-scroll timeout immediately
    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current)
      autoScrollTimeoutRef.current = null
    }

    // Mark all words before this word as spoken (clicked word becomes current/white)
    setSpokenWordIndices(() => {
      const next = new Set<number>()
      for (let i = 0; i < wordIndex; i++) {
        next.add(i)
      }
      return next
    })

    // Find which line contains this word and scroll to it
    const lineIndex = findLineIndexContainingWord(wordIndex)
    const line = scriptLinesRef.current[lineIndex]
    if (line && line.length > 0) {
      const firstWordIdx = line[0]
      if (firstWordIdx !== undefined) {
        scrollToLine(firstWordIdx)
      }
    }

    // Update current line index for speech recognition
    currentLineIndexRef.current = lineIndex

    // Jump to clicked word immediately
    setCurrentWordIndex(wordIndex)

    // Clear timing state so next word starts fresh
    remainingTimeRef.current = 0
    autoScrollStartTimeRef.current = 0

    // The useEffect will automatically resume auto-scrolling from this new word
  }, [autoScrollEnabled, playing, currentWordIndex, findLineIndexContainingWord, scrollToLine])

  // Disable RAF auto-scroll when auto-scroll is active
  useRafLoop(
    (deltaMs) => {
      const scroller = scrollerRef.current
      const content = contentRef.current
      if (!open) return
      if (!playing) return
      if (!scroller || !content) return
      if (autoScrollEnabled) return

      // Calculate pixel delta (no minimum speed clamp)
      const deltaPx = (speed * deltaMs) / 1000

      // Update virtual scroll position
      virtualScrollYRef.current += deltaPx

      // Clamp to valid range
      const maxScroll = Math.max(0, content.scrollHeight - scroller.clientHeight)
      virtualScrollYRef.current = Math.max(0, Math.min(virtualScrollYRef.current, maxScroll))

      // Apply transform to content
      content.style.transform = `translateY(-${virtualScrollYRef.current}px)`
    },
    open && playing
  )

  // Handle manual wheel scrolling
  useEffect(() => {
    const scroller = scrollerRef.current
    const content = contentRef.current
    if (!scroller || !content || !open) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      // Kill any lingering transition for immediate response — but NOT if we're in an autoscroll animation
      if (!hasTransitionRef.enabled) {
        content.style.transition = 'none'
      } else {
        return
      }

      // Update virtual scroll position based on wheel delta
      virtualScrollYRef.current += e.deltaY

      // Clamp to valid range
      const maxScroll = Math.max(0, content.scrollHeight - scroller.clientHeight)
      virtualScrollYRef.current = Math.max(0, Math.min(virtualScrollYRef.current, maxScroll))

      // Apply transform
      content.style.transform = `translateY(-${virtualScrollYRef.current}px)`
    }

    scroller.addEventListener('wheel', handleWheel, { passive: false })
    return () => scroller.removeEventListener('wheel', handleWheel)
  }, [open, playing, isPip, isEditing])

  // Sync scrollbar thumb position with virtual scroll
  useRafLoop(
    () => {
      if (!isDraggingScrollbarRef.current) {
        const scroller = scrollerRef.current
        const content = contentRef.current
        if (!scroller || !content) return

        const maxScroll = Math.max(0, content.scrollHeight - scroller.clientHeight)
        const scrollPercent = maxScroll > 0 ? virtualScrollYRef.current / maxScroll : 0

        // Calculate thumb height as proportion of visible content
        const thumbHeight = content.scrollHeight > 0
          ? Math.max(0.1, Math.min(1, scroller.clientHeight / content.scrollHeight))
          : 0.2

        setScrollbarThumbPosition(scrollPercent)
        setScrollbarThumbHeight(thumbHeight)
      }
    },
    open
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
    enabled: open && !isPip,
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

  // Scrollbar drag handlers — bypasses React state entirely for immediate feedback
  const handleScrollbarPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const track = scrollbarTrackRef.current
    const thumb = scrollbarThumbRef.current
    const scroller = scrollerRef.current
    const content = contentRef.current
    if (!track || !thumb || !scroller || !content) return

    isDraggingScrollbarRef.current = true
    const trackRect = track.getBoundingClientRect()

    // Disable all transitions for immediate feedback
    content.style.transition = 'none'
    thumb.style.transition = 'background-color 0.2s ease-in-out'
    hasTransitionRef.enabled = false

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const scroller = scrollerRef.current
      const content = contentRef.current
      const thumb = scrollbarThumbRef.current
      if (!scroller || !content || !thumb) return

      const thumbHeight = content.scrollHeight > 0
        ? Math.max(0.1, Math.min(1, scroller.clientHeight / content.scrollHeight))
        : 0.2

      const clickY = moveEvent.clientY - trackRect.top
      const trackHeight = trackRect.height
      const availableTrackHeight = 1 - thumbHeight
      const clickPercent = clickY / trackHeight
      const scrollPercent = availableTrackHeight > 0
        ? Math.max(0, Math.min(1, clickPercent / availableTrackHeight))
        : 0

      // Update content scroll via DOM directly (no React state)
      const maxScroll = Math.max(0, content.scrollHeight - scroller.clientHeight)
      virtualScrollYRef.current = scrollPercent * maxScroll
      content.style.transform = `translateY(-${virtualScrollYRef.current}px)`

      // Update thumb via DOM directly (no React state)
      thumb.style.top = `${scrollPercent * (1 - thumbHeight) * 100}%`
      thumb.style.height = `${thumbHeight * 100}%`
    }

    const handlePointerUp = () => {
      isDraggingScrollbarRef.current = false
      // Sync React state once at the end so RAF loop picks up
      const scroller = scrollerRef.current
      const content = contentRef.current
      if (scroller && content) {
        const maxScroll = Math.max(0, content.scrollHeight - scroller.clientHeight)
        const scrollPercent = maxScroll > 0 ? virtualScrollYRef.current / maxScroll : 0
        const thumbHeight = content.scrollHeight > 0
          ? Math.max(0.1, Math.min(1, scroller.clientHeight / content.scrollHeight))
          : 0.2
        setScrollbarThumbPosition(scrollPercent)
        setScrollbarThumbHeight(thumbHeight)
      }
      // Restore thumb transition
      if (scrollbarThumbRef.current) {
        scrollbarThumbRef.current.style.transition = 'top 0.3s ease-out, background-color 0.2s ease-in-out'
      }
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)

    // Handle initial click
    handlePointerMove(e.nativeEvent)
  }, [])

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

  // Helper to check if user is typing (works in both main window and PiP)
  const isTyping = useCallback(() => {
    // Check main document
    const mainActiveEl = document.activeElement
    if (mainActiveEl?.tagName === 'INPUT' || mainActiveEl?.tagName === 'TEXTAREA') {
      return true
    }

    // Check PiP document if in PiP mode
    if (isPip && scrollerRef.current) {
      const pipDoc = scrollerRef.current.ownerDocument
      const pipActiveEl = pipDoc.activeElement
      if (pipActiveEl?.tagName === 'INPUT' || pipActiveEl?.tagName === 'TEXTAREA') {
        return true
      }
    }

    return false
  }, [isPip])

  useHotkeys(
    useMemo(
      () => ({
        c: () => {
          if (isTyping()) return
          setQuickOpen((prev) => {
            const next = !prev
            onControlsOpenChange?.(next)
            return next
          })
        },
        y: () => {
          if (isTyping()) return
          if (isPip) return
          if (fixedToTop) {
            onUnfixFromTop()
          } else {
            onFixToTop()
          }
        },
        space: () => {
          if (isTyping()) return
          onTogglePlaying()
        },
        escape: () => {
          if (isTyping()) return
          if (!playing) return
          onTogglePlaying()
        },
        p: () => {
          if (isTyping()) return
          if (isPip) return  // Disable PiP toggle hotkey when already in PiP mode
          togglePip()
        }
      }),
      [onTogglePlaying, playing, onControlsOpenChange, fixedToTop, onFixToTop, onUnfixFromTop, togglePip, isPip, isTyping]
    ),
    open
  )

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      // Save virtual scroll position when hiding
      savedScrollTopRef.current = virtualScrollYRef.current
      tooltip.clear()
      setResizing(false)
      setQuickOpen(false)
      onControlsOpenChange?.(false)
    } else if (!wasOpenRef.current && open) {
      // Restore virtual scroll position when showing
      const content = contentRef.current
      if (content) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          virtualScrollYRef.current = savedScrollTopRef.current
          content.style.transform = `translateY(-${savedScrollTopRef.current}px)`
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

  // Reapply transform when transitioning to/from PiP to preserve scroll position
  useEffect(() => {
    const content = contentRef.current
    if (content && open) {
      requestAnimationFrame(() => {
        content.style.transform = `translateY(-${virtualScrollYRef.current}px)`
      })
    }
  }, [isPip, open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="floating-prompter"
          className={cn(
            'fixed z-30 overflow-hidden flex flex-col pointer-events-auto',
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
              <Tooltip enabled={!isPip} label={strings.hidePrompter} shortcut="H">
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
                  <Tooltip enabled={!isPip} label={playing ? strings.pausePrompter : strings.playPrompter} shortcut="Space">
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
                <PrompterBarCountdown
                  expandPopoverDown={!fixedToTop || isPip}
                  open={open}
                  budgetMs={timerBudgetMs}
                  onBudgetMsChange={setTimerBudgetMs}
                  remainingMs={timerRemainingMs}
                  onRemainingMsChange={setTimerRemainingMs}
                  wantsRun={timerWantsRun}
                  onWantsRunChange={setTimerWantsRun}
                />
                <Tooltip enabled={!isPip} label={strings.fixToTop} shortcut="Y">
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
                <Tooltip enabled={!isPip} label={strings.controls} shortcut="C">
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
                    <Tooltip enabled={!isPip} label={label} shortcut={isSafari ? undefined : "P"}>
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
                        {isPip ? <MonitorUp className="h-4 w-4" /> : <PictureInPicture className="h-4 w-4" />}
                      </button>
                    </Tooltip>
                  )
                })()}
                <Tooltip enabled={!isPip} label={strings.drag} tooltipId={DRAG_TOOLTIP_ID}>
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
              className={cn('tele-scroll absolute left-0 top-0 right-0 z-10 overflow-hidden select-none')}
              style={{ bottom: isPip ? 0 : (fixedToTop ? PROMPTER_HEADER_HEIGHT_PX : SCROLLBAR_BOTTOM_GUTTER_PX) }}
            >
              <div
                ref={contentRef}
                className="grid px-6 text-white/92 select-none transition-[padding] duration-500 ease-in-out"
                style={{
                  textAlign,
                  paddingTop: fixedToTop ? 8 : 24,
                  // Maintain consistent padding to prevent scroll jumps when toggling play/edit
                  paddingBottom: frame.height * 0.7,
                  minHeight: '100%',
                  willChange: 'transform',
                  transition: 'none', // Transitions added dynamically by scrollToLine
                }}
                onClick={() => {
                  setIsEditing(true)
                }}
              >
                {!playing && isEditing ? (
                  <>
                    <div
                      aria-hidden="true"
                      className={cn(
                        'col-start-1 row-start-1 invisible whitespace-pre-wrap font-medium leading-[1.35] tracking-[-0.02em] pointer-events-none',
                        !markdownEnabled && 'font-mono'
                      )}
                      style={{
                        fontSize,
                        fontFamily: markdownEnabled ? 'inherit' : 'monospace',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word'
                      }}
                    >
                      {script + '\n\n\n'}
                    </div>
                    <textarea
                      autoFocus
                      className="col-start-1 row-start-1 h-full w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-white/30"
                      style={{
                        fontSize,
                        textAlign,
                        color: 'inherit',
                        fontFamily: markdownEnabled ? 'inherit' : 'monospace',
                        lineHeight: '1.35',
                        letterSpacing: '-0.02em',
                        fontWeight: 500,
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word'
                      }}
                      value={script}
                      onChange={(e) => onScriptChange(e.target.value)}
                      onBlur={(e) => {
                        cursorPositionRef.current = e.target.selectionStart
                        setIsEditing(false)
                      }}
                      placeholder=""
                      spellCheck={false}
                      ref={textareaRef}
                      onSelect={() => scrollCursorIntoView()}
                      onKeyDown={(e) => {
                        // Prevent space from triggering play/pause while editing, unless modifier key is held
                        if (e.key === ' ' && !e.metaKey && !e.ctrlKey) {
                          e.stopPropagation()
                        }
                        // Allow Esc to blur (which might trigger close of something else, but good to release focus)
                        if (e.key === 'Escape') {
                          e.currentTarget.blur()
                        }
                      }}
                    />
                  </>
                ) : !displayScript ? (
                  <div
                    className={cn(
                      'whitespace-pre-wrap font-medium leading-[1.35] tracking-[-0.02em]',
                      !markdownEnabled && 'font-mono'
                    )}
                    style={{
                      fontSize,
                      textAlign,
                      fontFamily: markdownEnabled ? 'inherit' : 'monospace'
                    }}
                  >
                    <motion.span
                      animate={{ opacity: [1, 1, 0, 0] }}
                      transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: 'linear' }}
                      // Cursor hyperparameters: 1px width (border-l), height auto (matches font metrics via zero-width space)
                      className="border-l border-current"
                    >&#8203;</motion.span>
                    {'\n\n\n'}
                  </div>
                ) : markdownEnabled ? (
                  <div
                    className="font-medium leading-[1.35] tracking-[-0.02em]"
                    style={{ fontSize }}
                  >
                    {renderMarkdownBlocks(displayScript, spokenWordIndices, isPip, handleWordClick, autoScrollEnabled && playing)}
                    <div className="whitespace-pre-wrap leading-[1.35] text-transparent select-none pointer-events-none" style={{ fontSize }}>{'\n\n\n'}</div>
                  </div>
                ) : (
                  <pre
                    className="whitespace-pre-wrap font-medium leading-[1.35] tracking-[-0.02em]"
                    style={{ fontSize }}
                  >
                    {(() => {
                      const words = displayScript.split(/(\s+)/)
                      let wordIdx = 0
                      return words.map((word, i) => {
                        if (/\s+/.test(word)) return <Fragment key={i}>{word}</Fragment>
                        const idx = wordIdx++
                        const className = !spokenWordIndices.has(idx)
                          ? (isPip ? 'text-white/92' : '')
                          : (isPip ? 'text-[#666]' : 'opacity-40')
                        return (
                          <span
                            key={i}
                            data-word-idx={idx}
                            className={className}
                            onClick={(e) => {
                              if (autoScrollEnabled && playing) {
                                e.stopPropagation()
                                handleWordClick(idx)
                              }
                            }}
                            style={autoScrollEnabled && playing ? { cursor: 'pointer' } : undefined}
                          >
                            {word}
                          </span>
                        )
                      })
                    })()}
                    {'\n\n\n'}
                  </pre>
                )}
              </div>

              {/* Scrollbar */}
              {open && (
                <div
                  ref={scrollbarTrackRef}
                  onPointerDown={handleScrollbarPointerDown}
                  className="absolute right-1 top-2 bottom-2 w-3 cursor-pointer z-20 group"
                  style={{ touchAction: 'none' }}
                >
                  {/* Track - subtle line */}
                  <div className="absolute right-0 top-0 bottom-0 w-0.5 rounded-full bg-white/8 group-hover:bg-white/12 transition-colors" />

                  {/* Thumb - thin indicator */}
                  <div
                    ref={scrollbarThumbRef}
                    className="absolute right-0 w-0.5 rounded-full bg-white/20 group-hover:bg-white/30"
                    style={{
                      top: `${scrollbarThumbPosition * (1 - scrollbarThumbHeight) * 100}%`,
                      height: `${scrollbarThumbHeight * 100}%`,
                      minHeight: '30px',
                      transition: autoScrollEnabled && playing ? 'top 0.3s ease-out, background-color 0.2s ease-in-out' : 'background-color 0.2s ease-in-out'
                    }}
                  />
                </div>
              )}
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
              <Tooltip enabled={!isPip} label={strings.hidePrompter} shortcut="H">
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
                  <Tooltip enabled={!isPip} label={playing ? strings.pausePrompter : strings.playPrompter} shortcut="Space">
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
                <PrompterBarCountdown
                  expandPopoverDown={false}
                  open={open}
                  budgetMs={timerBudgetMs}
                  onBudgetMsChange={setTimerBudgetMs}
                  remainingMs={timerRemainingMs}
                  onRemainingMsChange={setTimerRemainingMs}
                  wantsRun={timerWantsRun}
                  onWantsRunChange={setTimerWantsRun}
                />
                <Tooltip enabled={!isPip} label={strings.unfixFromTop} shortcut="Y">
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
                <Tooltip enabled={!isPip} label={strings.controls} shortcut="C">
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
                    <Tooltip enabled={!isPip} label={label} shortcut={isSafari ? undefined : "P"}>
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
                        {isPip ? <MonitorUp className="h-4 w-4" /> : <PictureInPicture className="h-4 w-4" />}
                      </button>
                    </Tooltip>
                  )
                })()}
                <Tooltip enabled={!isPip} label={strings.drag} tooltipId={DRAG_TOOLTIP_ID}>
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

          {!isPip && (
            <div
              className="grip-hit absolute z-20 touch-none cursor-nwse-resize"
              style={fixedToTop
                ? { right: 0, bottom: 0, width: GRIP_FIXED_EDGE_WIDTH_PX, height: PROMPTER_HEADER_HEIGHT_PX }
                : { right: GRIP_INSET_PX, bottom: GRIP_INSET_PX, width: GRIP_HIT_SIZE_PX, height: GRIP_HIT_SIZE_PX }
              }
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
            autoScrollEnabled={autoScrollEnabled}
            wpm={wpm}
            playing={playing}
            onAutoScrollChange={onAutoScrollChange}
            onOpacityChange={onOpacityChange}
            onSpeedChange={onSpeedChange}
            onWpmChange={onWpmChange}
            onFontSizeChange={onFontSizeChange}
            onTextAlignChange={onTextAlignChange}
            isPip={isPip}
            pipWindow={pipWindowRef.current}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    isPip && pipWindowRef.current ? pipWindowRef.current.document.body : (document.getElementById('studio-portal') || document.body)
  )
}
