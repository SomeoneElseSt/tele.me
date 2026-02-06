import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Film, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Tooltip } from '../../components/Tooltip'
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
import * as videoStorage from '../../lib/videoStorage'
import {
  PROMPTER_CONTROLS_MIN_WIDTH,
  PROMPTER_FRAME_PADDING,
  PROMPTER_MIN_HEIGHT,
  PROMPTER_MIN_WIDTH,
  type PrompterFrame
} from './types'

const DEFAULT_SPEED = 52
const DEFAULT_FONT_SIZE = 44
const DEFAULT_OPACITY = 0.45
const DEFAULT_MIRROR_VIDEO = true
type TextAlign = 'left' | 'center' | 'right'
const DEFAULT_TEXT_ALIGN: TextAlign = 'left'
const DEFAULT_FRAME: PrompterFrame = { x: 40, y: 40, width: 960, height: 480 }

const LOCALE_STORAGE_KEY = 'teleme:locale'
const TAKE_NUMBER_STORAGE_KEY = 'teleme:next_take_number'
const SPEED_STORAGE_KEY = 'teleme:prompter_speed'
const FONT_SIZE_STORAGE_KEY = 'teleme:prompter_font_size'
const OPACITY_STORAGE_KEY = 'teleme:prompter_opacity'
const TEXT_ALIGN_STORAGE_KEY = 'teleme:prompter_text_align'
const FRAME_STORAGE_KEY = 'teleme:prompter_frame'
const FIXED_TO_TOP_STORAGE_KEY = 'teleme:prompter_fixed_to_top'
const PERSIST_VIDEOS_STORAGE_KEY = 'teleme:persist_videos'
const MAX_PERSISTENT_VIDEOS = 10

function getCenteredFrame(frame: PrompterFrame) {
  if (typeof window === 'undefined') return frame
  const x = (window.innerWidth - frame.width) / 2
  const y = (window.innerHeight - frame.height) / 2
  return { ...frame, x, y }
}

function clampFrame(frame: PrompterFrame) {
  if (typeof window === 'undefined') return frame
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
  const [speed, setSpeed] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_SPEED
    const saved = window.localStorage.getItem(SPEED_STORAGE_KEY)
    if (!saved) return DEFAULT_SPEED
    const parsed = Number(saved)
    if (isNaN(parsed) || parsed < 10 || parsed > 180) return DEFAULT_SPEED
    return parsed
  })
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_FONT_SIZE
    const saved = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY)
    if (!saved) return DEFAULT_FONT_SIZE
    const parsed = Number(saved)
    if (isNaN(parsed) || parsed < 22 || parsed > 72) return DEFAULT_FONT_SIZE
    return parsed
  })
  const [opacity, setOpacity] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_OPACITY
    const saved = window.localStorage.getItem(OPACITY_STORAGE_KEY)
    if (!saved) return DEFAULT_OPACITY
    const parsed = Number(saved)
    if (isNaN(parsed) || parsed < 0.15 || parsed > 0.95) return DEFAULT_OPACITY
    return parsed
  })
  const [textAlign, setTextAlign] = useState<TextAlign>(() => {
    if (typeof window === 'undefined') return DEFAULT_TEXT_ALIGN
    const saved = window.localStorage.getItem(TEXT_ALIGN_STORAGE_KEY)
    if (!saved) return DEFAULT_TEXT_ALIGN
    if (saved === 'left' || saved === 'center' || saved === 'right') {
      return saved
    }
    return DEFAULT_TEXT_ALIGN
  })
  const [prompterOpen, setPrompterOpen] = useState(true)
  const [prompterControlsOpen, setPrompterControlsOpen] = useState(false)
  const [prompterIsPip, setPrompterIsPip] = useState(false)
  const [forceCloseControls, setForceCloseControls] = useState(false)
  const [fixedToTop, setFixedToTop] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = window.localStorage.getItem(FIXED_TO_TOP_STORAGE_KEY)
    if (!saved) return false
    return saved === 'true'
  })
  const [frame, setFrame] = useState<PrompterFrame>(() => {
    if (typeof window === 'undefined') {
      return clampFrame(getCenteredFrame(DEFAULT_FRAME))
    }
    const saved = window.localStorage.getItem(FRAME_STORAGE_KEY)
    if (!saved) {
      return clampFrame(getCenteredFrame(DEFAULT_FRAME))
    }
    try {
      const parsed = JSON.parse(saved) as PrompterFrame
      if (
        typeof parsed.x === 'number' &&
        typeof parsed.y === 'number' &&
        typeof parsed.width === 'number' &&
        typeof parsed.height === 'number'
      ) {
        return clampFrame(parsed)
      }
    } catch {
      // Invalid JSON, fall back to default
    }
    return clampFrame(getCenteredFrame(DEFAULT_FRAME))
  })
  const [takes, setTakes] = useState<{ id: string; url: string; createdAt: number; mimeType?: string; takeNumber: number }[]>([])
  const takesRef = useRef(takes)
  const [playingTakeId, setPlayingTakeId] = useState<string | null>(null)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastProcessedUrlRef = useRef<string | null>(null)

  useEffect(() => {
    takesRef.current = takes
  }, [takes])

  const [persistVideos, setPersistVideos] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = window.localStorage.getItem(PERSIST_VIDEOS_STORAGE_KEY)
    return saved === 'true'
  })
  const [isLoadingVideos, setIsLoadingVideos] = useState(false)

  const [localeOpen, setLocaleOpen] = useState(false)
  const localeAnchorRef = useRef<HTMLButtonElement | null>(null)
  const localePanelRef = useRef<HTMLDivElement | null>(null)

  const [locale, setLocale] = useState<LocaleCode>('en')
  const localeRef = useRef<LocaleCode>(locale)
  const localeHoverTimeoutRef = useRef<any>(null)

  const getNextTakeNumber = useCallback(() => {
    if (typeof window === 'undefined') return 1
    const saved = window.localStorage.getItem(TAKE_NUMBER_STORAGE_KEY)
    if (!saved) return 1
    const next = parseInt(saved, 10)
    if (isNaN(next) || next < 1) return 1
    return next
  }, [])

  const incrementTakeNumber = useCallback(() => {
    if (typeof window === 'undefined') return
    const current = getNextTakeNumber()
    const next = current + 1
    window.localStorage.setItem(TAKE_NUMBER_STORAGE_KEY, next.toString())
    return current
  }, [getNextTakeNumber])

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
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SPEED_STORAGE_KEY, speed.toString())
  }, [speed])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize.toString())
  }, [fontSize])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(OPACITY_STORAGE_KEY, opacity.toString())
  }, [opacity])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(TEXT_ALIGN_STORAGE_KEY, textAlign)
  }, [textAlign])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(FRAME_STORAGE_KEY, JSON.stringify(frame))
  }, [frame])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(FIXED_TO_TOP_STORAGE_KEY, fixedToTop.toString())
  }, [fixedToTop])

  useEffect(() => {
    if (!fixedToTop) return
    if (frame.y === 0) return
    setFrame((prev) => clampFrame({ ...prev, y: 0 }))
  }, [fixedToTop, frame.y])

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

  // Load videos from IndexedDB on mount if persistVideos is enabled
  useEffect(() => {
    if (!persistVideos) return

    const loadStoredVideos = async () => {
      setIsLoadingVideos(true)
      try {
        const storedVideos = await videoStorage.loadVideos()
        const videosWithUrls = storedVideos.map(video => ({
          id: video.id,
          url: URL.createObjectURL(video.blob),
          createdAt: video.createdAt,
          mimeType: video.mimeType,
          takeNumber: video.takeNumber
        }))
        setTakes(videosWithUrls)
      } catch (error) {
        console.error('Failed to load videos from storage:', error)
      } finally {
        setIsLoadingVideos(false)
      }
    }

    void loadStoredVideos()
  }, []) // Only run on mount

  const error = recorder.error ?? streamError ?? devicesError

  const canRecord = useMemo(() => {
    const hasMediaAccess = ready && Boolean(stream) && recorder.supported
    if (!hasMediaAccess) return false

    // Disable recording if we have 10 videos and persistent storage is enabled
    if (persistVideos && takes.length >= MAX_PERSISTENT_VIDEOS) {
      return false
    }

    return true
  }, [ready, recorder.supported, stream, persistVideos, takes.length])


  const recordDisabledReason = useMemo(() => {
    if (!ready || !stream || !recorder.supported) return undefined
    if (persistVideos && takes.length >= MAX_PERSISTENT_VIDEOS) {
      return getStrings(locale).maxVideosReached
    }
    return undefined
  }, [ready, stream, recorder.supported, persistVideos, takes.length, locale])

  const elapsedLabel = useMemo(() => formatMs(recorder.elapsedMs), [recorder.elapsedMs])

  const onToggleRecord = useCallback(() => {
    if (recorder.status === 'recording') {
      recorder.stop()
      return
    }
    if (!canRecord) return
    recorder.start()
  }, [recorder, canRecord])

  const onTogglePrompter = useCallback(() => {
    if (!prompterOpen) {
      setPrompterOpen(true)
      setPlaying(true)
      return
    }
    setPlaying((v) => !v)
  }, [prompterOpen])

  const onToggleDrawer = useCallback(() => {
    setDrawerOpen((v) => {
      if (!v) {
        setLocaleOpen(false)
      }
      return !v
    })
  }, [])
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
        // Delete from IndexedDB if persistent storage is enabled
        if (persistVideos) {
          void videoStorage.deleteVideo(takeId)
        }
      }
      return prev.filter(t => t.id !== takeId)
    })
  }, [persistVideos])

  const onClearAllTakes = useCallback(() => {
    setTakes((prev) => {
      prev.forEach(take => {
        try {
          URL.revokeObjectURL(take.url)
        } catch {
          // ignore
        }
      })
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(TAKE_NUMBER_STORAGE_KEY, '1')
      }
      // Clear IndexedDB if persistent storage is enabled
      if (persistVideos) {
        void videoStorage.clearAllVideos()
      }
      return []
    })
  }, [persistVideos])

  const onPersistVideosChange = useCallback(async (enabled: boolean) => {
    setPersistVideos(enabled)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PERSIST_VIDEOS_STORAGE_KEY, enabled.toString())
    }

    if (enabled) {
      // Clear existing storage first to ensure exact sync with current state
      await videoStorage.clearAllVideos()

      // Save the first 10 (most recent) videos to IndexedDB
      const videosToSave = takes.slice(0, MAX_PERSISTENT_VIDEOS)
      for (const take of videosToSave) {
        try {
          const response = await fetch(take.url)
          const blob = await response.blob()

          // Check if take was deleted while processing
          if (!takesRef.current.some(t => t.id === take.id)) continue

          await videoStorage.saveVideo({
            id: take.id,
            blob,
            createdAt: take.createdAt,
            mimeType: take.mimeType,
            takeNumber: take.takeNumber
          })
        } catch (error) {
          console.error('Failed to save video to storage:', error)
        }
      }
    } else {
      // Clear all videos from IndexedDB when disabled
      await videoStorage.clearAllVideos()
    }
  }, [takes])

  const onPlayTake = useCallback((takeId: string) => {
    setPlayingTakeId(takeId)
    setVideoPlaying(false)
    if (prompterOpen) {
      setPrompterOpen(false)
      setPlaying(false)
    }
  }, [prompterOpen])

  const onCloseVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setPlayingTakeId(null)
    setVideoPlaying(false)
  }, [])

  const onToggleVideoPlayback = useCallback(() => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      void videoRef.current.play()
      setVideoPlaying(true)
    } else {
      videoRef.current.pause()
      setVideoPlaying(false)
    }
  }, [])

  useEffect(() => {
    const url = recorder.url
    const mimeType = recorder.mimeType
    if (!url) return

    // Prevent duplicate processing of the same video URL (e.g. when persistVideos toggles)
    if (url === lastProcessedUrlRef.current) return
    lastProcessedUrlRef.current = url

    setTakes((prev) => {
      if (prev.some(take => take.url === url)) return prev

      const createdAt = Date.now()
      const takeNumber = incrementTakeNumber() ?? 1
      const newTake = { id: `take-${createdAt}`, url, createdAt, mimeType, takeNumber }

      // Save to IndexedDB if persistent storage is enabled
      if (persistVideos) {
        // Fetch the blob and save it
        fetch(url)
          .then(response => response.blob())
          .then(blob => videoStorage.saveVideo({
            id: newTake.id,
            blob,
            createdAt: newTake.createdAt,
            mimeType: newTake.mimeType,
            takeNumber: newTake.takeNumber
          }))
          .catch(error => console.error('Failed to save video to storage:', error))
      }

      return [newTake, ...prev]
    })
  }, [recorder.url, recorder.mimeType, incrementTakeNumber, persistVideos])

  const onToggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // Ignore errors (user may have denied permission)
      })
    } else {
      document.exitFullscreen().catch(() => {
        // Ignore errors
      })
    }
  }, [])

  useHotkeys(
    useMemo(
      () => {
        const hotkeys: Record<string, () => void> = {}

        if (playingTakeId) {
          hotkeys.space = () => onToggleVideoPlayback()
          hotkeys.escape = () => onCloseVideo()
        } else {
          hotkeys.r = () => onToggleRecord()
          hotkeys.space = () => onTogglePrompter()
          hotkeys.t = () => onToggleDrawer()
          hotkeys.h = () => {
            if (prompterIsPip) return
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
          }
          hotkeys.m = () => {
            setMarkdownEnabled((prev) => !prev)
          }
          hotkeys.f = () => onToggleFullscreen()
          hotkeys.escape = () => {
            setDrawerOpen(false)
            setPlaying(false)
          }
        }

        return hotkeys
      },
      [onToggleDrawer, onTogglePrompter, onToggleRecord, prompterOpen, prompterControlsOpen, playingTakeId, onToggleVideoPlayback, onCloseVideo, onToggleFullscreen, prompterIsPip]
    ),
    true
  )

  const playingTake = playingTakeId ? takes.find(t => t.id === playingTakeId) : null

  return (
    <I18nProvider locale={locale}>
      <div className="fixed inset-0 overflow-hidden bg-black text-white/90">
        {playingTake ? (
          <div className="absolute inset-0 bg-black">
            <video
              ref={videoRef}
              src={playingTake.url}
              className="h-full w-full object-contain"
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
              onEnded={() => {
                setVideoPlaying(false)
                if (videoRef.current) {
                  videoRef.current.currentTime = 0
                }
              }}
            />
          </div>
        ) : (
          <StageVideo stream={stream} mirror={mirrorVideo} />
        )}

        <div className="pointer-events-none fixed left-6 top-6 z-30 flex items-center gap-2 text-white/80">
          <Tooltip
            label={
              <div className="flex flex-col gap-3 text-center">
                <span>
                  {strings.aboutMessage.split(/(open-source|open source|código abierto|オープンソース|ओपन-सोर्स|Open-Source|开源|مفتوح المصدر|código aberto|открытым исходным кодом)/i).map((part, index) => {
                    const isOpenSource = /^(open-source|open source|código abierto|オープンソース|ओपन-सोर्स|Open-Source|开源|مفتوح المصدر|código aberto|открытым исходным кодом)$/i.test(part);
                    if (isOpenSource) {
                      return (
                        <a
                          key={index}
                          href="https://github.com/SomeoneElseSt/tele.me"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-white"
                        >
                          {part}
                        </a>
                      );
                    }
                    return part;
                  })}
                  <a
                    href="https://stiven.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                  >
                    stiven.me
                  </a>
                </span>
                <span>{strings.browserWarningMessage}</span>
              </div>
            }
            side="bottom"
            sideOffset={6}
            interactive
            className="max-w-xs whitespace-normal text-center leading-relaxed"
          >
            <div className="pointer-events-auto p-4 -m-4 rounded-3xl">
              <div className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm backdrop-blur">
                <Film className="h-4 w-4 text-white/75" />
                <span className="tracking-[-0.02em]">tele.me</span>
              </div>
            </div>
          </Tooltip>
        </div>
        {!drawerOpen && (
          <div className="pointer-events-none fixed right-6 top-6 z-[60] flex items-center gap-2 text-white/80">
            <div
              className="pointer-events-auto relative p-4 -m-4"
              onMouseEnter={(e) => {
                if (e.buttons !== 0) return
                if (localeHoverTimeoutRef.current) clearTimeout(localeHoverTimeoutRef.current)
                setLocaleOpen(true)
              }}
              onMouseLeave={() => {
                localeHoverTimeoutRef.current = setTimeout(() => {
                  setLocaleOpen(false)
                }, 150)
              }}
            >
              <button
                ref={localeAnchorRef}
                type="button"
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
                    className="absolute right-4 mt-2 w-44 rounded-2xl border border-white/10 bg-black/80 p-2 text-xs text-white/80 shadow-glow backdrop-blur"
                    style={{ top: '56px' }}
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
        )}

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
          textAlign={textAlign}
          playing={playing}
          fixedToTop={fixedToTop}
          onOpacityChange={setOpacity}
          onSpeedChange={setSpeed}
          onFontSizeChange={setFontSize}
          onTextAlignChange={setTextAlign}
          onFixedToTopChange={setFixedToTop}
          onTogglePlaying={onTogglePrompter}
          onClose={() => {
            setPrompterOpen(false)
            setPlaying(false)
          }}
          onFrameChange={onFrameChange}
          onControlsOpenChange={setPrompterControlsOpen}
          onPipChange={setPrompterIsPip}
          onMarkdownEnabledChange={setMarkdownEnabled}
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
          onPlayTake={onPlayTake}
          playingTakeId={playingTakeId}
          videoPlaying={videoPlaying}
          onToggleVideoPlayback={onToggleVideoPlayback}
          onCloseVideo={onCloseVideo}
          onToggleFullscreen={onToggleFullscreen}
          persistVideos={persistVideos}
          onPersistVideosChange={onPersistVideosChange}
          isLoadingVideos={isLoadingVideos}
          recordDisabledReason={recordDisabledReason}
        />

        <SettingsDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          script={script}
          onScriptChange={setScript}
          markdownEnabled={markdownEnabled}
          onMarkdownEnabledChange={setMarkdownEnabled}
        />

        <div id="studio-portal" />
      </div>
    </I18nProvider>
  )
}
