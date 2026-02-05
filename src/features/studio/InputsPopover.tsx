import { AnimatePresence, motion } from 'framer-motion'
import { Camera, FlipHorizontal, Mic, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'
import { clamp } from '../../hooks/geometry'
import { useI18n } from './i18n'
import { Tooltip } from '../../components/Tooltip'

export type InputDevice = { id: string; label: string }

type Props = {
  open: boolean
  anchorEl: HTMLElement | null
  onClose: () => void
  cameras: InputDevice[]
  mics: InputDevice[]
  cameraId?: string
  micId?: string
  onCameraIdChange: (value?: string) => void
  onMicIdChange: (value?: string) => void
  mirrorVideo: boolean
  onMirrorVideoChange: (value: boolean) => void
}

const POPOVER_WIDTH = 340
const GAP_PX = 12
const MARGIN_PX = 12

function toSelectValue(value: string | undefined) {
  return value ?? ''
}

export function InputsPopover(props: Props) {
  const {
    open,
    anchorEl,
    onClose,
    cameras,
    mics,
    cameraId,
    micId,
    onCameraIdChange,
    onMicIdChange,
    mirrorVideo,
    onMirrorVideoChange
  } = props
  const { strings } = useI18n()

  const rect = open && anchorEl ? anchorEl.getBoundingClientRect() : null
  const desiredLeft = rect ? rect.left + rect.width / 2 - POPOVER_WIDTH / 2 : 0
  const left = rect ? clamp(desiredLeft, MARGIN_PX, window.innerWidth - POPOVER_WIDTH - MARGIN_PX) : 0
  const top = rect ? rect.top - GAP_PX : 0
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (popoverRef.current?.contains(target)) return
      if (anchorEl?.contains(target)) return
      onClose()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => window.removeEventListener('pointerdown', onPointerDown, true)
  }, [anchorEl, onClose, open])

  return createPortal(
    <AnimatePresence>
      {open && anchorEl && (
        <>
          <div
            className="fixed z-[70]"
            style={{
              left,
              top,
              width: POPOVER_WIDTH,
              transform: 'translateY(-100%)'
            }}
            ref={popoverRef}
          >
            <motion.div
              className="rounded-2xl border border-white/10 bg-black/70 p-4 text-xs text-white/70 shadow-glow backdrop-blur"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-white/75">{strings.inputsTitle}</div>
                <Tooltip label={strings.close} shortcut="Esc">
                  <button
                    type="button"
                    aria-label={strings.close}
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>

              <div className="mt-4 space-y-3">
                <div className="relative">
                  <select
                    value={toSelectValue(cameraId)}
                    onChange={(e) => onCameraIdChange(e.target.value || undefined)}
                    className={cn(
                      'h-11 w-full appearance-none rounded-2xl border bg-white/4 px-4 pr-10 text-sm text-white/85',
                      'border-white/10 focus:outline-none focus:ring-2 focus:ring-white/25'
                    )}
                  >
                    {cameras.length === 0 && <option value="">{strings.noCameras}</option>}
                    {cameras.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                    <Camera className="h-4 w-4" />
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={toSelectValue(micId)}
                    onChange={(e) => onMicIdChange(e.target.value || undefined)}
                    className={cn(
                      'h-11 w-full appearance-none rounded-2xl border bg-white/4 px-4 pr-10 text-sm text-white/85',
                      'border-white/10 focus:outline-none focus:ring-2 focus:ring-white/25'
                    )}
                  >
                    {mics.length === 0 && <option value="">{strings.noMics}</option>}
                    {mics.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                    <Mic className="h-4 w-4" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onMirrorVideoChange(!mirrorVideo)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all',
                    mirrorVideo
                      ? 'border-white/18 bg-white/8 text-white'
                      : 'border-white/10 bg-white/4 text-white/80 hover:bg-white/6'
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <FlipHorizontal className="h-4 w-4" />
                    <span>{strings.mirrorVideo}</span>
                  </span>
                  <span className="text-xs text-white/55">{mirrorVideo ? strings.on : strings.off}</span>
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
