import { useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Tooltip } from '../../components/Tooltip'
import { cn } from '../../lib/cn'
import { useHotkeys } from '../../hooks/useHotkeys'

type Props = {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  trimMode?: boolean
  trimStart?: number
  trimEnd?: number
  onTrimChange?: (start: number, end: number) => void
  onConfirmTrim?: () => void
  trimming?: boolean
  onExitTrim?: () => void
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VideoScrubber({
  currentTime,
  duration,
  onSeek,
  trimMode,
  trimStart,
  trimEnd,
  onTrimChange,
  onConfirmTrim,
  trimming,
  onExitTrim,
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const isDragging = useRef(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  useHotkeys(
    {
      enter: () => {
        if (trimming) return
        onConfirmTrim?.()
      },
    },
    trimMode
  )

  function seekFromPointer(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onSeek(ratio * duration)
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    isDragging.current = true
    setShowTooltip(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    seekFromPointer(e.clientX)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return
    seekFromPointer(e.clientX)
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    isDragging.current = false
    setShowTooltip(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  function makeHandleHandlers(which: 'start' | 'end') {
    return {
      onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
      },
      onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
        if (!(e.buttons & 1)) return
        const rect = trackRef.current?.getBoundingClientRect()
        if (!rect || !onTrimChange) return
        const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration
        if (which === 'start') {
          onTrimChange(Math.min(t, (trimEnd ?? duration) - 0.5), trimEnd ?? duration)
        } else {
          onTrimChange(trimStart ?? 0, Math.max(t, (trimStart ?? 0) + 0.5))
        }
      },
      onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      },
    }
  }

  const startPct = duration > 0 && trimStart != null ? (trimStart / duration) * 100 : 0
  const endPct = duration > 0 && trimEnd != null ? (trimEnd / duration) * 100 : 100

  return (
    <div className="fixed bottom-24 inset-x-0 z-24 flex justify-center pointer-events-none">
      <div className="pointer-events-auto relative w-[min(380px,calc(100vw-3rem))]">
        {/* Background — clipped so backdrop-blur doesn't leak */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-black/40 shadow-glow backdrop-blur" />
        </div>
        {/* Border — unclipped for clean anti-aliasing */}
        <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none" />

        {/* Trim confirm pill — absolute, right side of scrubber, on top of track */}
        <AnimatePresence>
          {trimMode && (
            <motion.div
              className="absolute right-3 bottom-full mb-2 z-20 rounded-xl border border-white/10 bg-black/90 px-2.5 py-1.5 whitespace-nowrap"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">{trimming ? 'Trimming…' : 'Trim?'}</span>
                <div className="flex items-center gap-1">
                  <Tooltip label="Confirm" shortcut="Enter">
                    <button
                      disabled={trimming}
                      onClick={() => onConfirmTrim?.()}
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25',
                        trimming && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <button
                    disabled={trimming}
                    onClick={() => onExitTrim?.()}
                    className={cn(
                      'inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
                      trimming && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="relative select-none px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-white/40 shrink-0">0:00</span>

            {/* Track wrapper — positioning context for the drag tooltip */}
            <div className="relative flex-1">
              {/* Drag tooltip: overflows above the pill, no reserved space */}
              {showTooltip && (
                <div
                  className="absolute bottom-full mb-3 -translate-x-1/2 pointer-events-none z-20"
                  style={{ left: `${progress}%` }}
                >
                  <div className="rounded-xl border border-white/10 bg-black/90 px-2.5 py-1 text-xs text-white/80 tabular-nums whitespace-nowrap backdrop-blur">
                    {formatDuration(currentTime)}
                  </div>
                </div>
              )}

              {/* Track */}
              <div
                ref={trackRef}
                className="relative h-1.5 w-full rounded-full bg-white/20 cursor-pointer"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                {/* Fill — z-index 1 */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-white/30"
                  style={{ width: `${progress}%`, zIndex: 1 }}
                />
                {/* Thumb — z-index above overlays/handles so it stays visible */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-white shadow pointer-events-none"
                  style={{ left: `${progress}%`, zIndex: 12 }}
                />

                {/* Trim overlays and handles */}
                {trimMode && (
                  <>
                    {/* Left dim overlay — taller than track to cover the thumb */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-l-full bg-black/50 pointer-events-none"
                      style={{ width: `${startPct}%`, zIndex: 2 }}
                    />
                    {/* Right dim overlay */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 right-0 h-1.5 rounded-r-full bg-black/50 pointer-events-none"
                      style={{ width: `${100 - endPct}%`, zIndex: 2 }}
                    />
                    {/* Start handle — z-index 10, always on top */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-8 cursor-ew-resize flex items-center justify-center"
                      style={{ left: `${startPct}%`, zIndex: 10 }}
                      {...makeHandleHandlers('start')}
                    >
                      <div className="w-[3px] h-5 rounded-full bg-white shadow pointer-events-none" />
                    </div>
                    {/* End handle */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-8 cursor-ew-resize flex items-center justify-center"
                      style={{ left: `${endPct}%`, zIndex: 10 }}
                      {...makeHandleHandlers('end')}
                    >
                      <div className="w-[3px] h-5 rounded-full bg-white shadow pointer-events-none" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <span className="text-xs tabular-nums text-white/40 shrink-0">
              {duration > 0 ? formatDuration(duration) : '0:00'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
