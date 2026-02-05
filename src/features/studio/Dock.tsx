import { AlignLeft, ChevronUp, Download, Pause, Play, Type, Video } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Tooltip } from '../../components/Tooltip'
import { InputsPopover, type InputDevice } from './InputsPopover'
import { DownloadPopover, type DownloadTake } from './DownloadPopover'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useI18n } from './i18n'

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
  mirrorVideo: boolean
  onMirrorVideoChange: (value: boolean) => void
  prompterOpen: boolean
  prompterPlaying: boolean
  onTogglePrompter: () => void
  onShowPrompter: () => void
  onToggleDrawer: () => void
  onDeleteTake: (takeId: string) => void
  onClearAllTakes: () => void
}

type DockButtonProps = {
  label: string
  shortcut?: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: ReactNode
}

function DockButton({ label, shortcut, onClick, disabled, active, children }: DockButtonProps) {
  return (
    <Tooltip label={label} shortcut={shortcut}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
          disabled && 'cursor-not-allowed opacity-40',
          active
            ? 'border-white/20 bg-white/10 text-white'
            : 'border-white/10 bg-white/6 text-white/80 hover:bg-white/10'
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
  mirrorVideo,
  onMirrorVideoChange,
  prompterOpen,
  prompterPlaying,
  onTogglePrompter,
  onShowPrompter,
  onToggleDrawer,
  onDeleteTake,
  onClearAllTakes
}: Props) {
  const { strings } = useI18n()
  const [inputsOpen, setInputsOpen] = useState(false)
  const inputsAnchorRef = useRef<HTMLButtonElement | null>(null)
  const [downloadsOpen, setDownloadsOpen] = useState(false)
  const downloadAnchorRef = useRef<HTMLButtonElement | null>(null)

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
  }, [])
  const onToggleDownloadsExclusive = useCallback(() => {
    setInputsOpen(false)
    setDownloadsOpen((v) => !v)
  }, [])

  useHotkeys(
    useMemo(
      () => ({
        i: () => {
          onToggleInputsExclusive()
        },
        d: () => {
          onToggleDownloadsExclusive()
        }
      }),
      [onToggleDownloadsExclusive, onToggleInputsExclusive]
    ),
    true
  )

  const recordDisabled = !canRecord && !recording

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      {/* Blur seam fix: clip blur to rounded bounds + isolate compositing. */}
      <div
        className="relative isolate rounded-3xl overflow-hidden"
        style={{ transform: 'translateZ(0)', contain: 'paint' }}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-0 rounded-3xl border border-white/10 shadow-glow',
            // Root cause fix: Overlapping backdrop-filter layers cause GPU compositing seams/artifacts.
            // When the downloads tray (which also uses backdrop-blur) is open, disable dock blur to prevent
            // overlapping blur surfaces. The darker background maintains visual consistency without blur.
            downloadsOpen ? 'bg-black/60' : 'bg-black/45 backdrop-blur'
          )}
          style={{
            transform: 'translateZ(0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        />
        <div
          className={cn(
            'relative flex items-center gap-2 rounded-3xl px-3 py-2'
          )}
          style={{ transform: 'translateZ(0)' }}
        >
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

        <DockButton label={strings.text} shortcut="T" onClick={onOpenDrawer}>
          <Type className="h-4 w-4" />
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

        <div className="relative inline-flex items-center">
          <div
            className={cn(
              'inline-flex h-11 overflow-hidden rounded-2xl border transition-all',
              'focus-within:outline-none focus-within:ring-2 focus-within:ring-white/30',
              recording ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-white/6 text-white/80',
              recordDisabled && 'opacity-40'
            )}
          >
            <Tooltip label={recording ? strings.stopRecording : strings.record} shortcut="R">
              <button
                type="button"
                onClick={onRecordClick}
                disabled={recordDisabled}
                className={cn(
                  'inline-flex h-11 w-11 items-center justify-center transition-colors',
                  'hover:bg-white/10 active:bg-white/12 focus-visible:outline-none'
                )}
                aria-label={recording ? strings.stopRecording : strings.startRecording}
              >
                <Video className="h-4 w-4" />
              </button>
            </Tooltip>

            <div className="h-full w-px bg-white/10" aria-hidden="true" />

            <Tooltip label={strings.inputs} shortcut="I">
              <button
                ref={inputsAnchorRef}
                type="button"
                aria-label={strings.inputs}
                onClick={onToggleInputsExclusive}
                disabled={recordDisabled}
                className={cn(
                  'inline-flex h-11 w-10 items-center justify-center transition-colors',
                  'hover:bg-white/10 active:bg-white/12 focus-visible:outline-none'
                )}
              >
                <ChevronUp className={cn('h-4 w-4 transition-transform', inputsOpen && 'rotate-180')} />
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
            mirrorVideo={mirrorVideo}
            onMirrorVideoChange={onMirrorVideoChange}
          />
        </div>

        <div className="relative inline-flex items-center">
          <Tooltip label={strings.videos} shortcut="D">
            <button
              ref={downloadAnchorRef}
              type="button"
              aria-label={strings.videos}
              onClick={onToggleDownloadsExclusive}
              className={cn(
                'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/80',
                'hover:bg-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30'
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
          />
        </div>
        </div>
      </div>
    </div>
  )
}
