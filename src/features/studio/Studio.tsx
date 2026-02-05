import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Film } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useMediaDevices } from '../../hooks/useMediaDevices'
import { useMediaStream } from '../../hooks/useMediaStream'
import { useRecorder } from '../../hooks/useRecorder'
import { useMirroredStream } from '../../hooks/useMirroredStream'
import { clamp } from '../../hooks/geometry'
import { formatMs } from '../recording/format'
import { Dock } from './Dock'
import { FloatingPrompter } from './FloatingPrompter'
import { SettingsDrawer } from './SettingsDrawer'
import { StageVideo } from './StageVideo'
import { cn } from '../../lib/cn'
import { I18nProvider, LOCALES, getStrings, type LocaleCode } from './i18n'
import {
  PROMPTER_CONTROLS_MIN_WIDTH,
  PROMPTER_FRAME_PADDING,
  PROMPTER_MIN_HEIGHT,
  PROMPTER_MIN_WIDTH,
  type PrompterFrame
} from './types'

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

  const [script, setScript] = useState(() => getStrings('en').defaultScript)
  const [markdownEnabled, setMarkdownEnabled] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(DEFAULT_SPEED)
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
  const [opacity, setOpacity] = useState(DEFAULT_OPACITY)
  const [mirrorText, setMirrorText] = useState(DEFAULT_MIRROR_TEXT)
  const [prompterOpen, setPrompterOpen] = useState(true)
  const [prompterControlsOpen, setPrompterControlsOpen] = useState(false)
  const [forceCloseControls, setForceCloseControls] = useState(false)
  const [frame, setFrame] = useState<PrompterFrame>(() => clampFrame(getCenteredFrame(DEFAULT_FRAME)))
  const [takes, setTakes] = useState<{ id: string; url: string; createdAt: number; mimeType?: string }[]>([])
  const takesRef = useRef(takes)
  
  useEffect(() => {
    takesRef.current = takes
  }, [takes])
  const [localeOpen, setLocaleOpen] = useState(false)
  const localeAnchorRef = useRef<HTMLButtonElement | null>(null)
  const localePanelRef = useRef<HTMLDivElement | null>(null)

  const LOCALE_STORAGE_KEY = 'teleme:locale'
  const [locale, setLocale] = useState<LocaleCode>('en')
  const localeRef = useRef<LocaleCode>(locale)

  const { stream, error: streamError, ready } = useMediaStream({
    audioDeviceId,
    videoDeviceId,
    facingMode: 'user'
  })

  const recordingStream = useMirroredStream(stream, mirrorVideo)
  const recorder = useRecorder(recordingStream)

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
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (!saved) return
    if (LOCALES.some((item) => item.code === saved)) {
      setLocale(saved as LocaleCode)
    }
  }, [LOCALES])

  const strings = getStrings(locale)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  }, [locale])

  useEffect(() => {
    const prevLocale = localeRef.current
    if (prevLocale === locale) return
    const prevDefault = getStrings(prevLocale).defaultScript
    if (script === prevDefault) {
      setScript(getStrings(locale).defaultScript)
    }
    localeRef.current = locale
  }, [locale, script])

  useEffect(() => {
    if (!localeOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (localePanelRef.current?.contains(target)) return
      if (localeAnchorRef.current?.contains(target)) return
      setLocaleOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => window.removeEventListener('pointerdown', onPointerDown, true)
  }, [localeOpen])

  useEffect(() => {
    const onResize = () => setFrame((prev) => clampFrame(prev))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    // Cleanup all blob URLs on unmount
    return () => {
      takesRef.current.forEach(take => {
        try {
          URL.revokeObjectURL(take.url)
        } catch {
          // ignore
        }
      })
    }
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

  const cameras = useMemo(() => mapDevices(strings.camera, videoInputs), [strings.camera, videoInputs])
  const mics = useMemo(() => mapDevices(strings.mic, audioInputs), [audioInputs, strings.mic])

  const onFrameChange = useCallback((update: Partial<PrompterFrame>) => {
    setFrame((prev) => clampFrame({ ...prev, ...update }))
  }, [])

  const onDeleteTake = useCallback((takeId: string) => {
    setTakes((prev) => {
      const take = prev.find(t => t.id === takeId)
      if (take) {
        try {
          URL.revokeObjectURL(take.url)
        } catch {
          // ignore
        }
      }
      return prev.filter(t => t.id !== takeId)
    })
  }, [])

  const onClearAllTakes = useCallback(() => {
    setTakes((prev) => {
      prev.forEach(take => {
        try {
          URL.revokeObjectURL(take.url)
        } catch {
          // ignore
        }
      })
      return []
    })
  }, [])

  useEffect(() => {
    const url = recorder.url
    const mimeType = recorder.mimeType
    if (!url) return
    
    setTakes((prev) => {
      if (prev.some(take => take.url === url)) return prev
      
      const createdAt = Date.now()
      return [{ id: `take-${createdAt}`, url, createdAt, mimeType }, ...prev]
    })
  }, [recorder.url, recorder.mimeType])

  useHotkeys(
    useMemo(
      () => ({
        r: () => onToggleRecord(),
        space: () => onTogglePrompter(),
        t: () => onToggleDrawer(),
        h: () => {
          if (prompterOpen) {
            if (prompterControlsOpen) {
              setForceCloseControls(true)
              window.setTimeout(() => {
                setForceCloseControls(false)
                setPrompterOpen(false)
                setPlaying(false)
              }, 150)
              return
            }
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
      [onToggleDrawer, onTogglePrompter, onToggleRecord, prompterOpen, prompterControlsOpen]
    ),
    true
  )

  return (
    <I18nProvider locale={locale}>
      <div className="fixed inset-0 overflow-hidden bg-black text-white/90">
      <StageVideo stream={stream} mirror={mirrorVideo} />

      <div className="pointer-events-none fixed left-6 top-6 z-30 flex items-center gap-2 text-white/80">
        <div className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm backdrop-blur">
          <Film className="h-4 w-4 text-white/75" />
          <span className="tracking-[-0.02em]">tele.me</span>
        </div>
      </div>
      <div className="pointer-events-none fixed right-6 top-6 z-30 flex items-center gap-2 text-white/80">
        <div className="pointer-events-auto relative">
          <button
            ref={localeAnchorRef}
            type="button"
            onClick={() => setLocaleOpen((prev) => !prev)}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm backdrop-blur"
            aria-label={strings.language}
          >
            <span className="text-[12px] font-semibold tracking-[0.2em] text-white/80">
              {LOCALES.find((item) => item.code === locale)?.short ?? 'EN'}
            </span>
          </button>
          <AnimatePresence>
            {localeOpen && (
              <motion.div
                ref={localePanelRef}
                className="absolute right-0 mt-2 w-44 rounded-2xl border border-white/10 bg-black/80 p-2 text-xs text-white/80 shadow-glow backdrop-blur"
                style={{ top: '100%' }}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}
              >
                <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
                  {strings.language}
                </div>
                <div className="mt-1 space-y-1">
                  {LOCALES.map((item) => {
                    const active = item.code === locale
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setLocale(item.code)
                          setLocaleOpen(false)
                        }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm transition-colors',
                          active ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <span>{item.label}</span>
                        <span className="text-[11px] font-semibold tracking-[0.14em] text-white/60">
                          {item.short}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
        onControlsOpenChange={setPrompterControlsOpen}
        forceCloseControls={forceCloseControls}
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
        onDeleteTake={onDeleteTake}
        onClearAllTakes={onClearAllTakes}
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
    </I18nProvider>
  )
}
