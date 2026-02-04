import { useCallback, useEffect, useMemo, useState } from 'react'
import { Film } from 'lucide-react'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useMediaDevices } from '../../hooks/useMediaDevices'
import { useMediaStream } from '../../hooks/useMediaStream'
import { useRecorder } from '../../hooks/useRecorder'
import { clamp } from '../../hooks/geometry'
import { formatMs } from '../recording/format'
import { Dock } from './Dock'
import { FloatingPrompter } from './FloatingPrompter'
import { SettingsDrawer } from './SettingsDrawer'
import { StageVideo } from './StageVideo'
import {
  PROMPTER_CONTROLS_MIN_WIDTH,
  PROMPTER_FRAME_PADDING,
  PROMPTER_MIN_HEIGHT,
  PROMPTER_MIN_WIDTH,
  type PrompterFrame
} from './types'

const DEFAULT_SCRIPT = `Your script goes here.\n\nSpace: play/pause\nR: record\nT: edit text\nC: teleprompter controls\nH: hide/show prompter\nI: control inputs\nD: download videos\n\nTo use markdown rendering and font, open the edit text pane (T) and enable it (M)`
const DEFAULT_SPEED = 52
const DEFAULT_FONT_SIZE = 44
const DEFAULT_OPACITY = 0.35
const DEFAULT_MIRROR_VIDEO = true
const DEFAULT_MIRROR_TEXT = false
const DEFAULT_FRAME: PrompterFrame = { x: 40, y: 40, width: 960, height: 480 }

function getCenteredFrame(frame: PrompterFrame) {
  if (typeof window === 'undefined') return frame
  const x = (window.innerWidth - frame.width) / 2
  const y = (window.innerHeight - frame.height) / 2
  return { ...frame, x, y }
}

function clampFrame(frame: PrompterFrame) {
  const vw = window.innerWidth
  const vh = window.innerHeight

  const minWidth = Math.max(PROMPTER_MIN_WIDTH, PROMPTER_CONTROLS_MIN_WIDTH)
  const maxWidth = Math.max(minWidth, vw - PROMPTER_FRAME_PADDING * 2)
  const maxHeight = Math.max(PROMPTER_MIN_HEIGHT, vh - PROMPTER_FRAME_PADDING * 2)

  const width = clamp(frame.width, minWidth, maxWidth)
  const height = clamp(frame.height, PROMPTER_MIN_HEIGHT, maxHeight)

  const maxX = Math.max(PROMPTER_FRAME_PADDING, vw - width - PROMPTER_FRAME_PADDING)
  const maxY = Math.max(PROMPTER_FRAME_PADDING, vh - height - PROMPTER_FRAME_PADDING)

  return {
    ...frame,
    width,
    height,
    x: clamp(frame.x, PROMPTER_FRAME_PADDING, maxX),
    y: clamp(frame.y, PROMPTER_FRAME_PADDING, maxY)
  }
}

function mapDevices(prefix: string, devices: MediaDeviceInfo[]) {
  return devices.map((d, idx) => ({
    id: d.deviceId,
    label: d.label || `${prefix} ${idx + 1}`
  }))
}

export function Studio() {
  const { audioInputs, videoInputs, error: devicesError } = useMediaDevices()
  const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>(undefined)
  const [videoDeviceId, setVideoDeviceId] = useState<string | undefined>(undefined)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mirrorVideo, setMirrorVideo] = useState(DEFAULT_MIRROR_VIDEO)

  const [script, setScript] = useState(DEFAULT_SCRIPT)
  const [markdownEnabled, setMarkdownEnabled] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(DEFAULT_SPEED)
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
  const [opacity, setOpacity] = useState(DEFAULT_OPACITY)
  const [mirrorText, setMirrorText] = useState(DEFAULT_MIRROR_TEXT)
  const [prompterOpen, setPrompterOpen] = useState(true)
  const [frame, setFrame] = useState<PrompterFrame>(() => clampFrame(getCenteredFrame(DEFAULT_FRAME)))
  const [takes, setTakes] = useState<{ id: string; url: string; createdAt: number }[]>([])

  const { stream, error: streamError, ready } = useMediaStream({
    audioDeviceId,
    videoDeviceId,
    facingMode: 'user'
  })

  const recorder = useRecorder(stream)

  useEffect(() => {
    if (audioDeviceId) return
    const id = audioInputs[0]?.deviceId
    if (!id) return
    setAudioDeviceId(id)
  }, [audioDeviceId, audioInputs])

  useEffect(() => {
    if (videoDeviceId) return
    const id = videoInputs[0]?.deviceId
    if (!id) return
    setVideoDeviceId(id)
  }, [videoDeviceId, videoInputs])

  useEffect(() => {
    const onResize = () => setFrame((prev) => clampFrame(prev))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const error = recorder.error ?? streamError ?? devicesError

  const canRecord = useMemo(() => ready && Boolean(stream) && recorder.supported, [ready, recorder.supported, stream])
  const elapsedLabel = useMemo(() => formatMs(recorder.elapsedMs), [recorder.elapsedMs])

  const onToggleRecord = useCallback(() => {
    if (recorder.status === 'recording') {
      recorder.stop()
      return
    }
    recorder.start()
  }, [recorder])

  const onTogglePrompter = useCallback(() => {
    if (!prompterOpen) {
      setPrompterOpen(true)
      setPlaying(true)
      return
    }
    setPlaying((v) => !v)
  }, [prompterOpen])

  const onToggleDrawer = useCallback(() => setDrawerOpen((v) => !v), [])
  const onShowPrompter = useCallback(() => setPrompterOpen(true), [])

  const cameras = useMemo(() => mapDevices('Camera', videoInputs), [videoInputs])
  const mics = useMemo(() => mapDevices('Mic', audioInputs), [audioInputs])

  const onFrameChange = useCallback((update: Partial<PrompterFrame>) => {
    setFrame((prev) => clampFrame({ ...prev, ...update }))
  }, [])

  useEffect(() => {
    const url = recorder.url
    if (!url) return
    setTakes((prev) => {
      if (prev[0]?.url === url) return prev
      const createdAt = Date.now()
      const next = [{ id: `take-${createdAt}`, url, createdAt }, ...prev]
      return next.slice(0, 3)
    })
  }, [recorder.url])

  useHotkeys(
    useMemo(
      () => ({
        r: () => onToggleRecord(),
        space: () => onTogglePrompter(),
        t: () => onToggleDrawer(),
        h: () => {
          if (prompterOpen) {
            setPrompterOpen(false)
            setPlaying(false)
            return
          }
          setPrompterOpen(true)
        },
        m: () => {
          setMarkdownEnabled((prev) => !prev)
        },
        escape: () => {
          setDrawerOpen(false)
          setPlaying(false)
        }
      }),
      [onToggleDrawer, onTogglePrompter, onToggleRecord, prompterOpen]
    ),
    true
  )

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white/90">
      <StageVideo stream={stream} mirror={mirrorVideo} />

      <div className="pointer-events-none fixed left-6 top-6 z-30 flex items-center gap-2 text-white/80">
        <div className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm backdrop-blur">
          <Film className="h-4 w-4 text-white/75" />
          <span className="tracking-[-0.02em]">tele.me</span>
        </div>
      </div>

      {error && (
        <div className="fixed left-1/2 top-6 z-40 -translate-x-1/2">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-100 backdrop-blur">
            {error}
          </div>
        </div>
      )}

      <FloatingPrompter
        open={prompterOpen}
        frame={frame}
        opacity={opacity}
        script={script}
        markdownEnabled={markdownEnabled}
        speed={speed}
        fontSize={fontSize}
        mirrorText={mirrorText}
        playing={playing}
        onOpacityChange={setOpacity}
        onSpeedChange={setSpeed}
        onFontSizeChange={setFontSize}
        onMirrorTextChange={setMirrorText}
        onTogglePlaying={onTogglePrompter}
        onClose={() => {
          setPrompterOpen(false)
          setPlaying(false)
        }}
        onFrameChange={onFrameChange}
      />

      <Dock
        canRecord={canRecord}
        recording={recorder.status === 'recording'}
        elapsedLabel={elapsedLabel}
        takes={takes}
        onToggleRecord={onToggleRecord}
        cameras={cameras}
        mics={mics}
        cameraId={videoDeviceId}
        micId={audioDeviceId}
        onCameraIdChange={setVideoDeviceId}
        onMicIdChange={setAudioDeviceId}
        mirrorVideo={mirrorVideo}
        onMirrorVideoChange={setMirrorVideo}
        prompterOpen={prompterOpen}
        prompterPlaying={playing}
        onTogglePrompter={onTogglePrompter}
        onShowPrompter={onShowPrompter}
        onToggleDrawer={onToggleDrawer}
      />

      <SettingsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        script={script}
        onScriptChange={setScript}
        markdownEnabled={markdownEnabled}
        onMarkdownEnabledChange={setMarkdownEnabled}
      />

      <div id="studio-portal" className="pointer-events-none" />
    </div>
  )
}
