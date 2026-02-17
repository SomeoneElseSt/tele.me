import { useRef, useState } from 'react'

type Props = {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VideoScrubber({ currentTime, duration, onSeek }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const isDragging = useRef(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

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

  return (
    <div className="fixed bottom-24 inset-x-0 z-30 flex justify-center pointer-events-none">
      <div className="pointer-events-auto relative w-[min(380px,calc(100vw-3rem))]">
        {/* Background — clipped so backdrop-blur doesn't leak */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-black/40 shadow-glow backdrop-blur" />
        </div>
        {/* Border — unclipped for clean anti-aliasing */}
        <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none" />

        {/* Content */}
        <div className="relative select-none px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-white/40 shrink-0">0:00</span>

            {/* Track wrapper — positioning context for the drag tooltip */}
            <div className="relative flex-1">
              {/* Drag tooltip: overflows above the pill, no reserved space */}
              {showTooltip && (
                <div
                  className="absolute bottom-full mb-3 -translate-x-1/2 pointer-events-none z-10"
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
                {/* Fill */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-white/30"
                  style={{ width: `${progress}%` }}
                />
                {/* Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-white shadow pointer-events-none"
                  style={{ left: `${progress}%` }}
                />
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
