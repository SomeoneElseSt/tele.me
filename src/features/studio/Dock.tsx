import { AlignLeft, Check, ChevronUp, Download, Maximize2, Minimize2, Pause, PenLine, Play, Scissors, Trash2, Video, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { Tooltip } from '../../components/Tooltip'
import { InputsPopover, type InputDevice } from './InputsPopover'
import { DownloadPopover, type DownloadTake } from './DownloadPopover'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useI18n } from './i18n'
import { formatFilename } from '../recording/format'

type Props = {
  canRecord: boolean
  recording: boolean
  elapsedLabel: string
  takes: DownloadTake[]
  onToggleRecord: () => void
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
  prompterOpen: boolean
  prompterPlaying: boolean
  onTogglePrompter: () => void
  onShowPrompter: () => void
  onToggleDrawer: () => void
  onDeleteTake: (takeId: string) => void
  onClearAllTakes: () => void
  onPlayTake: (takeId: string) => void
  playingTakeId: string | null
  videoPlaying: boolean
  onToggleVideoPlayback: () => void
  onCloseVideo: () => void
  onToggleFullscreen: () => void
  persistVideos: boolean
  onPersistVideosChange: (enabled: boolean) => void
  isLoadingVideos?: boolean
  storagePercent: number
  recordDisabledReason?: string
  error?: string
  warning?: string
  trimMode: boolean
  onToggleTrim: () => void
  topSlot?: ReactNode
  processingTakeIds?: Set<string>
}

type DockButtonProps = {
  label: string
  shortcut?: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  className?: string
  tooltipForceHide?: boolean
  children: ReactNode
}

function DockButton({ label, shortcut, onClick, disabled, active, className, tooltipForceHide, children }: DockButtonProps) {
  return (
    <Tooltip label={label} shortcut={shortcut} forceHide={tooltipForceHide}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-all',
          'focus:outline-none',
          disabled && 'cursor-not-allowed opacity-40',
          active
            ? 'border-white/20 bg-white/10 text-white'
            : 'border-white/10 bg-white/6 text-white/80 hover:bg-white/10',
          className
        )}
      >
        {children}
      </button>
    </Tooltip>
  )
}

export function Dock({
  canRecord,
  recording,
  elapsedLabel,
  takes,
  onToggleRecord,
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
  onMirrorVideoChange,
  prompterOpen,
  prompterPlaying,
  onTogglePrompter,
  onShowPrompter,
  onToggleDrawer,
  onDeleteTake,
  onClearAllTakes,
  onPlayTake,
  playingTakeId,
  videoPlaying,
  onToggleVideoPlayback,
  onCloseVideo,
  onToggleFullscreen,
  persistVideos,
  onPersistVideosChange,
  isLoadingVideos,
  storagePercent,
  recordDisabledReason,
  error,
  warning,
  trimMode,
  onToggleTrim,
  topSlot,
  processingTakeIds,
}: Props) {
  const { strings } = useI18n()
  const [inputsOpen, setInputsOpen] = useState(false)
  const inputsAnchorRef = useRef<HTMLButtonElement | null>(null)
  const [downloadsOpen, setDownloadsOpen] = useState(false)
  const downloadAnchorRef = useRef<HTMLButtonElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(() => {
    if (typeof document === 'undefined') return false
    return !!document.fullscreenElement
  })
  const [hideFullscreenTooltip, setHideFullscreenTooltip] = useState(false)

  // Track delete confirmation state for the active video
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [hasOpenedInputs, setHasOpenedInputs] = useState(() => {
    if (typeof window === 'undefined') return true // Default to true (hidden) on server to match hydration if persisted
    return window.localStorage.getItem('teleme.me:has_opened_inputs_v2') === 'true'
  })

  // Reset confirmation when playing video changes
  useEffect(() => {
    setConfirmDelete(false)
  }, [playingTakeId])

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Dismiss the default-open inputs tooltip on any user interaction
  useEffect(() => {
    if (hasOpenedInputs) return

    const dismissTooltip = () => {
      setHasOpenedInputs(true)
      window.localStorage.setItem('teleme.me:has_opened_inputs_v2', 'true')
    }

    // Dismiss on any mouse movement (user is active)
    window.addEventListener('mousemove', dismissTooltip, { once: true })
    // Also dismiss on any click
    window.addEventListener('click', dismissTooltip, { once: true })

    return () => {
      window.removeEventListener('mousemove', dismissTooltip)
      window.removeEventListener('click', dismissTooltip)
    }
  }, [hasOpenedInputs])

  const playingTake = useMemo(
    () => (playingTakeId ? takes.find((t) => t.id === playingTakeId) : null),
    [takes, playingTakeId]
  )

  const onCloseInputs = useCallback(() => setInputsOpen(false), [])
  const onOpenDrawer = useCallback(() => {
    setInputsOpen(false)
    onToggleDrawer()
  }, [onToggleDrawer])

  const onRecordClick = useCallback(() => {
    setInputsOpen(false)
    onToggleRecord()
  }, [onToggleRecord])

  const onCloseDownloads = useCallback(() => setDownloadsOpen(false), [])
  const onToggleInputsExclusive = useCallback(() => {
    setDownloadsOpen(false)
    setInputsOpen((v) => !v)
    if (!hasOpenedInputs) {
      setHasOpenedInputs(true)
      window.localStorage.setItem('teleme.me:has_opened_inputs_v2', 'true')
    }
  }, [hasOpenedInputs])
  const onToggleDownloadsExclusive = useCallback(() => {
    setInputsOpen(false)
    setDownloadsOpen((v) => !v)
  }, [])

  const handleDownloadActive = useCallback(async () => {
    if (!playingTake) return

    try {
      const response = await fetch(playingTake.url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      const ext = playingTake.mimeType?.includes('mp4') ? 'mp4' : 'webm'
      a.download = formatFilename(playingTake.createdAt, ext)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch {
      alert('Download failed')
    }
  }, [playingTake])

  const handleDeleteActive = useCallback(() => {
    if (!playingTakeId) return
    onDeleteTake(playingTakeId)
    onCloseVideo()
  }, [playingTakeId, onDeleteTake, onCloseVideo])

  useHotkeys(
    useMemo(
      () => ({
        i: () => {
          onToggleInputsExclusive()
        },
        d: () => {
          if (playingTakeId && playingTake) {
            handleDownloadActive()
          } else {
            onToggleDownloadsExclusive()
          }
        },
        escape: () => {
          if (confirmDelete) {
            setConfirmDelete(false)
            return
          }
          if (inputsOpen) {
            setInputsOpen(false)
          }
          if (downloadsOpen) {
            setDownloadsOpen(false)
          }
        },
        delete: () => {
          if (playingTakeId) {
            setConfirmDelete((v) => !v)
          }
        },
        backspace: () => {
          if (playingTakeId) {
            setConfirmDelete((v) => !v)
          }
        },
        enter: () => {
          if (confirmDelete) {
            handleDeleteActive()
          }
        }
      }),
      [downloadsOpen, inputsOpen, onToggleDownloadsExclusive, onToggleInputsExclusive, playingTakeId, playingTake, handleDownloadActive, confirmDelete, handleDeleteActive]
    ),
    true
  )

  const recordDisabled = !canRecord && !recording
  const isVideoPlaying = playingTakeId !== null

  return (
    // Fixed container centered with flex to avoid transform scaling trap on fixed children
    <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-center gap-4">
        {topSlot && (
          <div className="flex justify-center w-full">{topSlot}</div>
        )}
        <div className="relative">
          <AnimatePresence>
            {error && (
              <motion.div
                key="dock-error"
                className="absolute bottom-full left-0 right-0 mb-3"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }}
            >
              <div className="rounded-3xl border border-white/10 bg-black/60 px-4 py-2 text-xs text-white/70 backdrop-blur text-center leading-relaxed shadow-glow">
                {error}
              </div>
            </motion.div>
          )}
            {warning && !error && (
              <motion.div
                key="dock-warning"
                className="absolute bottom-full left-0 right-0 mb-3"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }}
              >
                <div className="rounded-3xl border border-white/10 bg-black/60 px-4 py-2 text-xs text-white/70 backdrop-blur text-center leading-relaxed shadow-glow">
                  {warning}
                </div>
              </motion.div>
            )}
        </AnimatePresence>
          {/* Background Pill - Clipped for blur */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-black/40 shadow-glow backdrop-blur" />
          </div>
          {/* Border Overlay - Not clipped so anti-aliasing stays clean */}
          <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none" />

          {/* Content - Unclipped so tooltips/popups can escape */}
          <div className="relative flex items-center gap-2 px-3 py-2">
          {!isVideoPlaying && (
            <div
              className="hidden min-w-[86px] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 sm:flex"
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  recording ? 'bg-red-400 shadow-[0_0_0_6px_rgba(248,113,113,0.12)]' : 'bg-white/25'
                )}
              />
              <span className="tabular-nums">{elapsedLabel}</span>
            </div>
          )}

          {isVideoPlaying ? (
            <>
              <Tooltip label={strings.close} shortcut="Esc">
                <button
                  type="button"
                  onClick={onCloseVideo}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/80 hover:bg-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  aria-label={strings.close}
                >
                  <X className="h-4 w-4" />
                </button>
              </Tooltip>

              <DockButton
                label={videoPlaying ? strings.pauseVideo : strings.playVideo}
                shortcut="Space"
                onClick={onToggleVideoPlayback}
                active={videoPlaying}
              >
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span
                    className={cn(
                      'absolute transition-[opacity,transform] duration-200 ease-in-out',
                      videoPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    )}
                  >
                    <Pause className="h-4 w-4" />
                  </span>
                  <span
                    className={cn(
                      'absolute transition-[opacity,transform] duration-200 ease-in-out',
                      videoPlaying ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                    )}
                  >
                    <Play className="h-4 w-4" />
                  </span>
                </span>
              </DockButton>

              <DockButton
                label={strings.download}
                shortcut="D"
                onClick={handleDownloadActive}
              >
                <Download className="h-4 w-4" />
              </DockButton>

              <DockButton
                label={trimMode ? strings.exitTrim : strings.trimVideo}
                shortcut="T"
                onClick={onToggleTrim}
                active={trimMode}
              >
                <Scissors className="h-4 w-4" />
              </DockButton>

              <div className="relative">
                <DockButton
                  label={confirmDelete ? "" : strings.deleteTakeLabel(playingTake?.takeNumber || 0)}
                  shortcut={strings.deleteKey}
                  onClick={() => setConfirmDelete(!confirmDelete)}
                  active={confirmDelete}
                  className={confirmDelete ? "bg-red-500/20 border-red-500/30 text-red-400" : "hover:text-red-400 hover:bg-white/10"}
                >
                  <Trash2 className="h-4 w-4" />
                </DockButton>
                <AnimatePresence>
                  {confirmDelete && (
                    <motion.div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-[80] rounded-xl border border-white/10 bg-black/90 px-2.5 py-1.5 whitespace-nowrap"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/60">{strings.confirmQuestion}</span>
                        <div className="flex items-center gap-1">
                          <Tooltip label={strings.confirm} shortcut="Enter">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteActive()
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/25"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </Tooltip>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmDelete(false)
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <DockButton label={strings.text} shortcut="T" onClick={onOpenDrawer}>
                <PenLine className="h-4 w-4" />
              </DockButton>

              <DockButton label={isFullscreen ? strings.exitFullscreen : strings.enterFullscreen} shortcut="F" tooltipForceHide={hideFullscreenTooltip} onClick={() => {
                setHideFullscreenTooltip(true)
                setTimeout(() => {
                  onToggleFullscreen()
                  setTimeout(() => setHideFullscreenTooltip(false), 50)
                }, 200)
              }}>
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span
                    className={cn(
                      'absolute transition-[opacity,transform] duration-200 ease-in-out',
                      isFullscreen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    )}
                  >
                    <Minimize2 className="h-4 w-4" />
                  </span>
                  <span
                    className={cn(
                      'absolute transition-[opacity,transform] duration-200 ease-in-out',
                      isFullscreen ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                    )}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </span>
                </span>
              </DockButton>

              {!prompterOpen ? (
                <DockButton
                  label={strings.showPrompter}
                  shortcut="H"
                  onClick={() => {
                    setInputsOpen(false)
                    onShowPrompter()
                  }}
                >
                  <AlignLeft className="h-4 w-4" />
                </DockButton>
              ) : (
                <DockButton
                  label={prompterPlaying ? strings.pausePrompter : strings.playPrompter}
                  shortcut="Space"
                  onClick={() => {
                    setInputsOpen(false)
                    onTogglePrompter()
                  }}
                  active={prompterPlaying}
                >
                  <span className="relative flex h-4 w-4 items-center justify-center">
                    <span
                      className={cn(
                        'absolute transition-[opacity,transform] duration-200 ease-in-out',
                        prompterPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                      )}
                    >
                      <Pause className="h-4 w-4" />
                    </span>
                    <span
                      className={cn(
                        'absolute transition-[opacity,transform] duration-200 ease-in-out',
                        prompterPlaying ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                      )}
                    >
                      <Play className="h-4 w-4" />
                    </span>
                  </span>
                </DockButton>
              )}
            </>
          )}

          {!isVideoPlaying && (
            <>
              <div className="relative inline-flex items-center">
                <div
                  className={cn(
                    'inline-flex h-11 overflow-hidden rounded-2xl border transition-all',
                    recording
                      ? 'border-white/20 bg-white/10 text-white'
                      : 'border-white/10 bg-white/6 text-white/80'
                  )}
                >
                  <Tooltip label={recordDisabled ? (recordDisabledReason || strings.record) : (recording ? strings.stopRecording : strings.record)} shortcut="R">
                    <button
                      type="button"
                      onClick={onRecordClick}
                      disabled={recordDisabled}
                      className={cn(
                        'inline-flex h-11 w-11 items-center justify-center transition-colors',
                        'hover:bg-white/10 active:bg-white/12 focus-visible:outline-none',
                        recordDisabled && 'cursor-not-allowed opacity-40'
                      )}
                      aria-label={recording ? strings.stopRecording : strings.startRecording}
                    >
                      <Video className="h-4 w-4" />
                    </button>
                  </Tooltip>

                  <div className="h-full w-px bg-white/10" aria-hidden="true" />

                  <Tooltip
                    label={strings.inputsTooltip}
                    shortcut="I"
                    defaultOpen={!inputsOpen && !hasOpenedInputs}
                    onDefaultOpenDismiss={() => {
                      setHasOpenedInputs(true)
                      window.localStorage.setItem('teleme.me:has_opened_inputs_v2', 'true')
                    }}
                  >
                    <button
                      ref={inputsAnchorRef}
                      type="button"
                      aria-label={strings.inputs}
                      onClick={onToggleInputsExclusive}
                      disabled={recording}
                      className={cn(
                        'inline-flex h-11 w-10 items-center justify-center transition-colors',
                        'hover:bg-white/10 active:bg-white/12 focus-visible:outline-none',
                        inputsOpen && 'bg-white/10 text-white',
                        recording && 'cursor-not-allowed opacity-40'
                      )}
                    >
                      <ChevronUp
                        className={cn(
                          'h-4 w-4 transition-all',
                          inputsOpen ? 'rotate-180' : ''
                        )}
                      />
                    </button>
                  </Tooltip>
                </div>
                <InputsPopover
                  open={inputsOpen}
                  anchorEl={inputsAnchorRef.current}
                  onClose={onCloseInputs}
                  cameras={cameras}
                  mics={mics}
                  cameraId={cameraId}
                  micId={micId}
                  onCameraIdChange={onCameraIdChange}
                  onMicIdChange={onMicIdChange}
                  cameraEnabled={cameraEnabled}
                  onCameraEnabledChange={onCameraEnabledChange}
                  micEnabled={micEnabled}
                  onMicEnabledChange={onMicEnabledChange}
                  mirrorVideo={mirrorVideo}
                  onMirrorVideoChange={onMirrorVideoChange}
                />
              </div>

              <div className="relative inline-flex items-center gap-2">
                <Tooltip label={strings.videos} shortcut="D">
                  <button
                    ref={downloadAnchorRef}
                    type="button"
                    aria-label={strings.videos}
                    onClick={onToggleDownloadsExclusive}
                    className={cn(
                      'inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-all',
                      'hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                      downloadsOpen
                        ? 'border-white/20 bg-white/10 text-white'
                        : 'border-white/10 bg-white/6 text-white/80'
                    )}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </Tooltip>
                <DownloadPopover
                  open={downloadsOpen}
                  anchorEl={downloadAnchorRef.current}
                  takes={takes}
                  onClose={onCloseDownloads}
                  onDeleteTake={onDeleteTake}
                  onClearAll={onClearAllTakes}
                  onPlayTake={onPlayTake}
                  persistVideos={persistVideos}
                  onPersistVideosChange={onPersistVideosChange}
                  isLoadingVideos={isLoadingVideos}
                  storagePercent={storagePercent}
                  processingTakeIds={processingTakeIds}
                />
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
