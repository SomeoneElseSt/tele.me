import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Eye, Gauge, Move, SlidersHorizontal, Type, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useRafLoop } from '../../hooks/useRafLoop'
import { usePointerDrag } from '../../hooks/usePointerDrag'
import { usePointerResize } from '../../hooks/usePointerResize'
import { clamp } from '../../hooks/geometry'
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

const QUICK_PANEL_WIDTH = 340
const QUICK_PANEL_GAP_PX = 10
const QUICK_PANEL_MIN_MARGIN_PX = 12
const GRIP_HIT_SIZE_PX = 32
const GRIP_INSET_PX = 10
const GRIP_VISUAL_SIZE_PX = 46

function toNumber(value: string) {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return null
  return parsed
}

function SliderRow({
  icon,
  title,
  value,
  min,
  max,
  step,
  onChange
}: {
  icon: ReactNode
  title: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/65">
        {icon}
      </div>
      <div className="flex-1">
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

function QuickControlsPortal({
  open,
  frame,
  opacity,
  speed,
  fontSize,
  mirrorText,
  onClose,
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
  onClose: () => void
  onOpacityChange: (value: number) => void
  onSpeedChange: (value: number) => void
  onFontSizeChange: (value: number) => void
  onMirrorTextChange: (value: boolean) => void
}) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed z-[70]"
          style={{
            left: clamp(
              frame.x + frame.width / 2 - QUICK_PANEL_WIDTH / 2,
              QUICK_PANEL_MIN_MARGIN_PX,
              window.innerWidth - QUICK_PANEL_WIDTH - QUICK_PANEL_MIN_MARGIN_PX
            ),
            top: Math.max(QUICK_PANEL_MIN_MARGIN_PX, frame.y - QUICK_PANEL_GAP_PX),
            width: QUICK_PANEL_WIDTH,
            transform: 'translateY(-100%)'
          }}
        >
          <motion.div
            className="rounded-2xl border border-white/10 bg-black/65 p-4 text-xs text-white/70 shadow-glow backdrop-blur"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}
          >
            <div className="space-y-3">
              <SliderRow
                icon={<Gauge className="h-4 w-4" />}
                title="Speed"
                value={speed}
                min={10}
                max={180}
                step={1}
                onChange={onSpeedChange}
              />
              <SliderRow
                icon={<Type className="h-4 w-4" />}
                title="Text size"
                value={fontSize}
                min={22}
                max={72}
                step={1}
                onChange={onFontSizeChange}
              />
              <SliderRow
                icon={<Eye className="h-4 w-4" />}
                title="Opacity"
                value={opacity}
                min={0.15}
                max={0.95}
                step={0.01}
                onChange={onOpacityChange}
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => onMirrorTextChange(!mirrorText)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-all',
                    mirrorText
                      ? 'border-white/18 bg-white/8 text-white'
                      : 'border-white/10 bg-white/4 text-white/80 hover:bg-white/6'
                  )}
                >
                  <Type className="h-3.5 w-3.5" />
                  <span>Mirror</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-xs text-white/70 hover:bg-white/6 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
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
    onMove: (next) => onFrameChange({ x: next.x, y: next.y })
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
  }, [open])

  if (!open) return null

  return (
    <div
      className={cn('fixed z-40 overflow-hidden rounded-2xl border border-white/12 shadow-glow')}
      style={{
        width: frame.width,
        height: frame.height,
        transform: `translate3d(${frame.x}px, ${frame.y}px, 0)`,
        backgroundColor: `rgba(0,0,0,${opacity})`
      }}
    >
      <div
        className={cn(
          'flex h-11 items-center justify-between gap-2 border-b border-white/10 px-3 text-white/85',
          'cursor-grab active:cursor-grabbing select-none touch-none'
        )}
        onPointerDown={drag.onPointerDown}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide prompter"
          title="Hide prompter"
          onPointerDown={(e) => e.stopPropagation()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setQuickOpen((v) => !v)}
            aria-label="Prompter controls"
            title="Prompter controls"
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70',
              'hover:bg-white/10 hover:text-white'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <Move className="h-4 w-4 text-white/60" />
          </span>
        </div>
      </div>

      <div className="relative h-[calc(100%-44px)]">
        <div
          ref={scrollerRef}
          className={cn('tele-scroll absolute left-0 top-0 bottom-0 right-0 z-10 overflow-y-auto')}
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

      <QuickControlsPortal
        open={quickOpen}
        frame={frame}
        opacity={opacity}
        speed={speed}
        fontSize={fontSize}
        mirrorText={mirrorText}
        onClose={() => setQuickOpen(false)}
        onOpacityChange={onOpacityChange}
        onSpeedChange={onSpeedChange}
        onFontSizeChange={onFontSizeChange}
        onMirrorTextChange={onMirrorTextChange}
      />
    </div>
  )
}
