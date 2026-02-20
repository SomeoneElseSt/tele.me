import { AnimatePresence, motion } from 'framer-motion'
import { Camera, CameraOff, FlipHorizontal, Mic, MicOff, X } from 'lucide-react'
import { useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'
import { clamp } from '../../hooks/geometry'
import { useI18n } from './i18n'
import { Tooltip } from '../../components/Tooltip'
import { useTooltipController } from '../../components/useTooltipController'

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
  cameraEnabled: boolean
  onCameraEnabledChange: (value: boolean) => void
  micEnabled: boolean
  onMicEnabledChange: (value: boolean) => void
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
    cameraEnabled,
    onCameraEnabledChange,
    micEnabled,
    onMicEnabledChange,
    mirrorVideo,
    onMirrorVideoChange
  } = props
  const { strings } = useI18n()
  const tooltip = useTooltipController()

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

  useEffect(() => {
    if (!open) {
      tooltip.clear()
    }
  }, [open, tooltip])

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
              className="rounded-2xl border border-white/10 bg-black/40 shadow-glow backdrop-blur text-xs text-white/70"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-white/75">{strings.inputsTitle}</div>
                  <Tooltip label={strings.close} shortcut="Esc">
                    <button
                      type="button"
                      aria-label={strings.close}
                      onClick={() => {
                        tooltip.clear()
                        onClose()
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white outline-none"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        value={toSelectValue(cameraId)}
                        onChange={(e) => onCameraIdChange(e.target.value || undefined)}
                        className={cn(
                          'h-11 w-full appearance-none rounded-2xl border bg-white/6 px-4 text-sm text-white/85 transition-all outline-none',
                          'border-white/10 hover:border-white/20 hover:bg-white/10 focus:bg-white/12 focus:border-white/25 focus:ring-2 focus:ring-white/30'
                        )}
                      >
                        {cameras.length === 0 && <option value="">{strings.noCameras}</option>}
                        {cameras.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCameraEnabledChange(!cameraEnabled)}
                      className={cn(
                        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all outline-none',
                        cameraEnabled
                          ? 'border-white/20 bg-white/12 text-white'
                          : 'border-white/10 bg-white/6 text-white/40 hover:bg-white/10 hover:text-white/70'
                      )}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {cameraEnabled ? (
                          <motion.span
                            key="on"
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.15 }}
                            className="flex"
                          >
                            <Camera className="h-4 w-4" />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="off"
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.15 }}
                            className="flex"
                          >
                            <CameraOff className="h-4 w-4" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        value={toSelectValue(micId)}
                        onChange={(e) => onMicIdChange(e.target.value || undefined)}
                        className={cn(
                          'h-11 w-full appearance-none rounded-2xl border bg-white/6 px-4 text-sm text-white/85 transition-all outline-none',
                          'border-white/10 hover:border-white/20 hover:bg-white/10 focus:bg-white/12 focus:border-white/25 focus:ring-2 focus:ring-white/30'
                        )}
                      >
                        {mics.length === 0 && <option value="">{strings.noMics}</option>}
                        {mics.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => onMicEnabledChange(!micEnabled)}
                      className={cn(
                        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all outline-none',
                        micEnabled
                          ? 'border-white/20 bg-white/12 text-white'
                          : 'border-white/10 bg-white/6 text-white/40 hover:bg-white/10 hover:text-white/70'
                      )}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {micEnabled ? (
                          <motion.span
                            key="on"
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.15 }}
                            className="flex"
                          >
                            <Mic className="h-4 w-4" />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="off"
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.15 }}
                            className="flex"
                          >
                            <MicOff className="h-4 w-4" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onMirrorVideoChange(!mirrorVideo)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all outline-none',
                      mirrorVideo
                        ? 'border-white/20 bg-white/12 text-white'
                        : 'border-white/10 bg-white/6 text-white/80 hover:bg-white/10 hover:border-white/20'
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <FlipHorizontal className="h-4 w-4" />
                      <span>{strings.mirrorVideo}</span>
                    </span>
                    <span className="text-xs text-white/55">{mirrorVideo ? strings.on : strings.off}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
