import { useMemo, useRef, useState } from 'react'
import { AlignLeft, Eye, Gauge, Move, SlidersHorizontal, Type, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useRafLoop } from '../../hooks/useRafLoop'
import { usePointerDrag } from '../../hooks/usePointerDrag'
import { usePointerResize } from '../../hooks/usePointerResize'
import { Slider } from '../../components/Slider'
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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
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
      })
  })

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
        <div className="flex items-center gap-2 text-xs text-white/70">
          <AlignLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prompter</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setQuickOpen((v) => !v)}
            aria-label="Prompter controls"
            title="Prompter controls"
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
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide prompter"
            title="Hide prompter"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {quickOpen && (
        <div className="absolute left-3 top-[52px] z-50" style={{ width: QUICK_PANEL_WIDTH }}>
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-white/70 backdrop-blur">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-white/60" />
                    <span>Speed</span>
                  </div>
                  <span className="tabular-nums">{Math.round(speed)} px/s</span>
                </div>
                <div className="mt-2">
                  <Slider value={speed} min={10} max={180} step={1} onChange={onSpeedChange} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-white/60" />
                    <span>Text</span>
                  </div>
                  <span className="tabular-nums">{fontSize}px</span>
                </div>
                <div className="mt-2">
                  <Slider value={fontSize} min={22} max={72} step={1} onChange={onFontSizeChange} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-white/60" />
                    <span>Opacity</span>
                  </div>
                  <span className="tabular-nums">{formatPercent(opacity)}</span>
                </div>
                <div className="mt-2">
                  <Slider value={opacity} min={0.15} max={0.95} step={0.01} onChange={onOpacityChange} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => onMirrorTextChange(!mirrorText)}
                className={cn(
                  'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all',
                  mirrorText
                    ? 'border-white/18 bg-white/8 text-white'
                    : 'border-white/10 bg-white/4 text-white/80 hover:bg-white/6'
                )}
              >
                <span>Mirror text</span>
                <span className="text-xs text-white/55">{mirrorText ? 'On' : 'Off'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={scrollerRef} className={cn('tele-scroll relative h-[calc(100%-44px)] overflow-y-auto')}>
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
        className={cn(
          'absolute bottom-2 right-2 h-5 w-5 rounded-md border border-white/12 bg-white/10',
          'cursor-nwse-resize touch-none'
        )}
        onPointerDown={resize.onPointerDown}
      />
    </div>
  )
}
