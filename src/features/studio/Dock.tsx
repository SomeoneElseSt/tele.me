import { AlignLeft, ChevronUp, Download, Pause, Play, Type, Video } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Tooltip } from '../../components/Tooltip'
import { InputsPopover, type InputDevice } from './InputsPopover'

type Props = {
  canRecord: boolean
  recording: boolean
  elapsedLabel: string
  downloadUrl?: string
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
  downloadUrl,
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
  onToggleDrawer
}: Props) {
  const [inputsOpen, setInputsOpen] = useState(false)
  const inputsAnchorRef = useRef<HTMLButtonElement | null>(null)

  const onToggleInputs = useCallback(() => setInputsOpen((v) => !v), [])
  const onOpenDrawer = useCallback(() => {
    setInputsOpen(false)
    onToggleDrawer()
  }, [onToggleDrawer])

  const onRecordClick = useCallback(() => {
    setInputsOpen(false)
    onToggleRecord()
  }, [onToggleRecord])

  const recordDisabled = !canRecord && !recording

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <motion.div
        className={cn(
          'flex items-center gap-2 rounded-3xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur'
        )}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="hidden min-w-[86px] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 sm:flex">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              recording ? 'bg-red-400 shadow-[0_0_0_6px_rgba(248,113,113,0.12)]' : 'bg-white/25'
            )}
          />
          <span className="tabular-nums">{elapsedLabel}</span>
        </div>

        <DockButton label="Text" shortcut="?" onClick={onOpenDrawer}>
          <Type className="h-4 w-4" />
        </DockButton>

        {!prompterOpen ? (
          <DockButton
            label="Show prompter"
            onClick={() => {
              setInputsOpen(false)
              onShowPrompter()
            }}
          >
            <AlignLeft className="h-4 w-4" />
          </DockButton>
        ) : (
          <DockButton
            label={prompterPlaying ? 'Pause prompter' : 'Play prompter'}
            shortcut="Space"
            onClick={() => {
              setInputsOpen(false)
              onTogglePrompter()
            }}
            active={prompterPlaying}
          >
            {prompterPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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
            <Tooltip label={recording ? 'Stop recording' : 'Record'} shortcut="R">
              <button
                type="button"
                onClick={onRecordClick}
                disabled={recordDisabled}
                className={cn(
                  'inline-flex h-11 w-11 items-center justify-center transition-colors',
                  'hover:bg-white/10 active:bg-white/12 focus-visible:outline-none'
                )}
                aria-label={recording ? 'Stop recording' : 'Start recording'}
              >
                <Video className="h-4 w-4" />
              </button>
            </Tooltip>

            <div className="h-full w-px bg-white/10" aria-hidden="true" />

            <Tooltip label="Inputs">
              <button
                ref={inputsAnchorRef}
                type="button"
                aria-label="Inputs"
                onClick={onToggleInputs}
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
            onClose={() => setInputsOpen(false)}
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

        {downloadUrl && (
          <Tooltip label="Download">
            <a
              href={downloadUrl}
              download={`teleme-${new Date().toISOString().replaceAll(':', '')}.webm`}
              className={cn(
                'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/80',
                'hover:bg-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30'
              )}
              aria-label="Download"
            >
              <Download className="h-4 w-4" />
            </a>
          </Tooltip>
        )}
      </motion.div>
    </div>
  )
}
