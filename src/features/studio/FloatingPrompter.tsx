import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Eye, Gauge, Move, SlidersHorizontal, Type, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { Tooltip } from '../../components/Tooltip'
import { useTooltipController } from '../../components/useTooltipController'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useRafLoop } from '../../hooks/useRafLoop'
import { usePointerDrag } from '../../hooks/usePointerDrag'
import { usePointerResize } from '../../hooks/usePointerResize'
import { PROMPTER_MIN_HEIGHT, PROMPTER_MIN_WIDTH, type PrompterFrame } from './types'

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
const CONTROLS_BAR_HEIGHT_PX = 96
const PROMPTER_HEADER_HEIGHT_PX = 52
const DRAG_TOOLTIP_ID = 'studio-prompter-drag'

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
  icon: ReactNode
  title: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  formatValue?: (value: number) => string
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 px-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 pb-2">
          <div className="truncate text-[11px] text-white/65">{title}</div>
          <div className="shrink-0 tabular-nums text-[11px] text-white/50">
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
            'h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 outline-none',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/80 [&::-webkit-slider-thumb]:shadow',
            '[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/25',
            '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110',
            '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white/80',
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
  const top = Math.max(
    CONTROLS_BAR_MIN_MARGIN_PX,
    frame.y - CONTROLS_BAR_HEIGHT_PX - CONTROLS_BAR_GAP_PX
  )

  return createPortal(
    <AnimatePresence initial={false}>
      {open && (
        <div
          className="fixed z-[70]"
          style={{
            left: frame.x,
            top,
            width: frame.width,
            perspective: 1200
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <motion.div
            className="overflow-hidden rounded-2xl border border-white/12 shadow-glow backdrop-blur"
            style={{ backgroundColor: `rgba(0,0,0,${barAlpha})` }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }}
          >
            <motion.div
              className="relative"
              style={{ transformOrigin: 'bottom' }}
              initial={{ rotateX: 76 }}
              animate={{ rotateX: 0 }}
              exit={{ rotateX: 76 }}
              transition={{ type: 'spring', stiffness: 460, damping: 40, mass: 0.7 }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/8 via-white/0 to-white/0" aria-hidden="true" />

              <div
                className={cn(
                  'relative flex h-[96px] items-stretch',
                  'divide-x divide-white/10'
                )}
              >
                <ControlCell
                  icon={<Gauge className="h-4 w-4" />}
                  title="Speed"
                  value={speed}
                  min={10}
                  max={180}
                  step={1}
                  formatValue={(v) => `${Math.round(v)}`}
                  onChange={onSpeedChange}
                />
                <ControlCell
                  icon={<Type className="h-4 w-4" />}
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

                <div className="flex w-[92px] items-center justify-center px-3">
                  <button
                    type="button"
                    onClick={() => onMirrorTextChange(!mirrorText)}
                    aria-label="Mirror text"
                    title="Mirror text"
                    className={cn(
                      'inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-xs transition-all',
                      mirrorText
                        ? 'border-white/18 bg-white/10 text-white'
                        : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/8'
                    )}
                  >
                    <Type className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
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

  const resize = usePointerResize({
    enabled: open,
    getOrigin: () => ({ width: frame.width, height: frame.height }),
    onResize: (next) =>
      onFrameChange({
        width: Math.max(PROMPTER_MIN_WIDTH, next.width),
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
    if (open) return
    setResizing(false)
    setQuickOpen(false)
  }, [open])

  if (!open) return null

  return (
    <div
      className={cn('fixed z-40 overflow-hidden rounded-2xl border border-white/10 shadow-glow')}
      style={{
        width: frame.width,
        height: frame.height,
        transform: `translate3d(${frame.x}px, ${frame.y}px, 0)`,
        backgroundColor: `rgba(0,0,0,${opacity})`
      }}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-2 border-b border-white/10 px-4 text-white/85',
          'cursor-grab active:cursor-grabbing select-none touch-none'
        )}
        style={{ height: PROMPTER_HEADER_HEIGHT_PX }}
        onPointerDown={drag.onPointerDown}
      >
        <Tooltip label="Hide prompter">
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
          <Tooltip label="Controls">
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
        style={{ right: GRIP_INSET_PX, bottom: GRIP_INSET_PX, width: GRIP_HIT_SIZE_PX, height: GRIP_HIT_SIZE_PX }}
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
    </div>
  )
}
