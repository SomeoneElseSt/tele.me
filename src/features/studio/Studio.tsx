import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Film, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Tooltip, TooltipProvider } from '../../components/Tooltip'
import { useTooltipController } from '../../components/useTooltipController'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useMediaDevices } from '../../hooks/useMediaDevices'
import { useMediaStream } from '../../hooks/useMediaStream'
import { useRecorder } from '../../hooks/useRecorder'
import { useMirroredStream } from '../../hooks/useMirroredStream'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useAudioSilenceDetection } from '../../hooks/useAudioSilenceDetection'
import { useRafLoop } from '../../hooks/useRafLoop'
import { clamp } from '../../hooks/geometry'
import { formatMs } from '../recording/format'
import { Dock } from './Dock'
import { FloatingPrompter } from './FloatingPrompter'
import { SettingsDrawer } from './SettingsDrawer'
import { StageVideo } from './StageVideo'
import { VideoScrubber } from './VideoScrubber'
import { cn } from '../../lib/cn'
import { I18nProvider, LOCALES, getStrings, type LocaleCode } from './i18n'
import * as videoStorage from '../../lib/videoStorage'
import { remuxVideo, trimVideo } from '../../lib/videoTrim'
import {
  PROMPTER_CONTROLS_MIN_WIDTH,
  PROMPTER_FRAME_PADDING,
  PROMPTER_MIN_HEIGHT,
  PROMPTER_MIN_WIDTH,
  type PrompterFrame
} from './types'

const DEFAULT_SPEED = 30
const DEFAULT_FONT_SIZE = 44
const DEFAULT_OPACITY = 0.45
const DEFAULT_MIRROR_VIDEO = true
type TextAlign = 'left' | 'center' | 'right'
const DEFAULT_TEXT_ALIGN: TextAlign = 'center'
const DEFAULT_FRAME: PrompterFrame = { x: 40, y: 40, width: 440, height: 820 }
const DEFAULT_TRIM_START_RATIO = 0.1
const DEFAULT_TRIM_END_RATIO = 0.9
const MIN_TRIM_SPAN = 0.5

const LOCALE_STORAGE_KEY = 'teleme.me:locale'
const TAKE_NUMBER_STORAGE_KEY = 'teleme.me:next_take_number'
const SPEED_STORAGE_KEY = 'teleme.me:prompter_speed'
const FONT_SIZE_STORAGE_KEY = 'teleme.me:prompter_font_size'
const OPACITY_STORAGE_KEY = 'teleme.me:prompter_opacity'
const TEXT_ALIGN_STORAGE_KEY = 'teleme.me:prompter_text_align'
const FRAME_STORAGE_KEY = 'teleme.me:prompter_frame'
const FIXED_TO_TOP_STORAGE_KEY = 'teleme.me:prompter_fixed_to_top'
const PERSIST_VIDEOS_STORAGE_KEY = 'teleme.me:persist_videos'
const SCRIPT_STORAGE_KEY = 'teleme.me:script'
const MARKDOWN_ENABLED_STORAGE_KEY = 'teleme.me:markdown_enabled'
const AUDIO_DEVICE_ID_STORAGE_KEY = 'teleme.me:audio_device_id'
const VIDEO_DEVICE_ID_STORAGE_KEY = 'teleme.me:video_device_id'
const MIRROR_VIDEO_STORAGE_KEY = 'teleme.me:mirror_video'
const CAMERA_ENABLED_STORAGE_KEY = 'teleme.me:camera_enabled'
const MIC_ENABLED_STORAGE_KEY = 'teleme.me:mic_enabled'

type ShortcutRow = { key: string; description: string }

function parseShortcutsMenu(menu: string): ShortcutRow[] {
  const rows: ShortcutRow[] = []
  for (const line of menu.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const colonIndex = trimmed.search(/[:：]/)
    if (colonIndex < 0) continue
    const key = trimmed.slice(0, colonIndex).trim()
    const description = trimmed.slice(colonIndex + 1).trim()
    if (!key || !description) continue
    rows.push({ key, description })
  }
  return rows
}

function ShortcutsTable({ menu }: { menu: string }) {
  const rows = useMemo(() => parseShortcutsMenu(menu), [menu])
  return (
    <table className="w-full text-left text-sm">
      <tbody>
        {rows.map(({ key, description }, i) => (
          <tr key={i} className="border-b border-white/10 last:border-0">
            <td className="py-1 pr-3 align-baseline">
              <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-xs font-medium text-white/95">
                {key}
              </kbd>
            </td>
            <td className="py-1 text-white/85">{description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

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

  const [audioDeviceId, setAudioDeviceId] = useLocalStorage<string | undefined>(AUDIO_DEVICE_ID_STORAGE_KEY, undefined)
  const [videoDeviceId, setVideoDeviceId] = useLocalStorage<string | undefined>(VIDEO_DEVICE_ID_STORAGE_KEY, undefined)
  const [mirrorVideo, setMirrorVideo] = useLocalStorage(MIRROR_VIDEO_STORAGE_KEY, DEFAULT_MIRROR_VIDEO)
  const [cameraEnabled, setCameraEnabled] = useLocalStorage(CAMERA_ENABLED_STORAGE_KEY, true)
  const [micEnabled, setMicEnabled] = useLocalStorage(MIC_ENABLED_STORAGE_KEY, true)
  const [autoScrollEnabled, setAutoScrollEnabled] = useLocalStorage('teleme.me:auto_scroll', false)
  const [wpm, setWpm] = useLocalStorage('teleme.me:wpm', 150, (v) => {
    const num = Number(v)
    return Number.isFinite(num) ? Math.max(100, Math.min(300, num)) : 150
  })

  const [drawerOpen, setDrawerOpen] = useState(false)

  const [script, setScript] = useLocalStorage(SCRIPT_STORAGE_KEY, getStrings('en').defaultScript)
  const [markdownEnabled, setMarkdownEnabled] = useLocalStorage(MARKDOWN_ENABLED_STORAGE_KEY, false)

  const [playing, setPlaying] = useState(false)

  const [speed, setSpeed] = useLocalStorage(SPEED_STORAGE_KEY, DEFAULT_SPEED, (v) => {
    const parsed = Number(v)
    if (isNaN(parsed) || parsed < 10 || parsed > 180) return DEFAULT_SPEED
    return parsed
  })

  const [fontSize, setFontSize] = useLocalStorage(FONT_SIZE_STORAGE_KEY, DEFAULT_FONT_SIZE, (v) => {
    const parsed = Number(v)
    if (isNaN(parsed) || parsed < 22 || parsed > 72) return DEFAULT_FONT_SIZE
    return parsed
  })

  const [opacity, setOpacity] = useLocalStorage(OPACITY_STORAGE_KEY, DEFAULT_OPACITY, (v) => {
    const parsed = Number(v)
    if (isNaN(parsed) || parsed < 0.15 || parsed > 0.95) return DEFAULT_OPACITY
    return parsed
  })

  const [textAlign, setTextAlign] = useLocalStorage<TextAlign>(TEXT_ALIGN_STORAGE_KEY, DEFAULT_TEXT_ALIGN, (v) => {
    if (v === 'left' || v === 'center' || v === 'right') return v
    return DEFAULT_TEXT_ALIGN
  })

  const [prompterOpen, setPrompterOpen] = useState(true)
  const [prompterControlsOpen, setPrompterControlsOpen] = useState(false)
  const [prompterIsPip, setPrompterIsPip] = useState(false)
  const [forceCloseControls, setForceCloseControls] = useState(false)

  const [fixedToTop, setFixedToTop] = useLocalStorage(FIXED_TO_TOP_STORAGE_KEY, false)

  const [frame, setFrame] = useLocalStorage<PrompterFrame>(FRAME_STORAGE_KEY, clampFrame(getCenteredFrame(DEFAULT_FRAME)), (v) => {
    if (
      typeof v?.x === 'number' &&
      typeof v?.y === 'number' &&
      typeof v?.width === 'number' &&
      typeof v?.height === 'number'
    ) {
      return clampFrame(v)
    }
    return clampFrame(getCenteredFrame(DEFAULT_FRAME))
  })

  const [takes, setTakes] = useState<{ id: string; url: string; createdAt: number; mimeType?: string; takeNumber: number }[]>([])
  const takesRef = useRef(takes)
  const [playingTakeId, setPlayingTakeId] = useState<string | null>(null)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [trimMode, setTrimMode] = useState(false)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [trimming, setTrimming] = useState(false)
  const [processingTakeIds, setProcessingTakeIds] = useState<Set<string>>(new Set())
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastProcessedUrlRef = useRef<string | null>(null)

  useRafLoop(() => {
    if (videoRef.current) setVideoCurrentTime(videoRef.current.currentTime)
  }, videoPlaying)

  useEffect(() => {
    takesRef.current = takes
  }, [takes])

  const [persistVideos, setPersistVideos] = useLocalStorage(PERSIST_VIDEOS_STORAGE_KEY, true)
  const [isLoadingVideos, setIsLoadingVideos] = useState(false)
  const [storagePercent, setStoragePercent] = useState(0)

  const refreshStorageQuota = useCallback(async () => {
    const usedBytes = await videoStorage.getStorageSize()
    const usedMB = usedBytes / (1024 * 1024)
    const capMB = 300 // matches MAX_STORAGE_MB in videoStorage
    setStoragePercent(Math.min(100, Math.max(0, Math.round((usedMB / capMB) * 100))))
  }, [])

  useEffect(() => {
    void refreshStorageQuota()
  }, [refreshStorageQuota])

  const [localeOpen, setLocaleOpen] = useState(false)
  const tooltip = useTooltipController()
  const localeAnchorRef = useRef<HTMLButtonElement | null>(null)
  const localePanelRef = useRef<HTMLDivElement | null>(null)

  const [locale, setLocale] = useLocalStorage<LocaleCode>(LOCALE_STORAGE_KEY, 'en', (v) => {
    if (LOCALES.some((item) => item.code === v)) return v as LocaleCode
    return 'en'
  })
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

  const strings = getStrings(locale)

  const { stream, error: streamError, ready } = useMediaStream({
    audioDeviceId,
    videoDeviceId,
    audioEnabled: micEnabled,
    videoEnabled: cameraEnabled,
    facingMode: 'user',
    braveBlockedMessage: strings.braveBlockedMessage
  })

  const recordingStream = useMirroredStream(stream, mirrorVideo)
  const recorder = useRecorder(recordingStream)
  const { isSilent } = useAudioSilenceDetection(stream, recorder.status === 'recording')

  useEffect(() => {
    const isMissing = audioDeviceId && audioInputs.length > 0 && !audioInputs.some((d) => d.deviceId === audioDeviceId)
    const shouldDefault = !audioDeviceId && audioInputs.length > 0

    if (!isMissing && !shouldDefault) return

    setAudioDeviceId(audioInputs[0]?.deviceId)
  }, [audioDeviceId, audioInputs, setAudioDeviceId])

  useEffect(() => {
    const isMissing = videoDeviceId && videoInputs.length > 0 && !videoInputs.some((d) => d.deviceId === videoDeviceId)
    const shouldDefault = !videoDeviceId && videoInputs.length > 0

    if (!isMissing && !shouldDefault) return

    setVideoDeviceId(videoInputs[0]?.deviceId)
  }, [videoDeviceId, videoInputs, setVideoDeviceId])

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
    if (storagePercent >= 90) return false
    return true
  }, [ready, recorder.supported, stream, storagePercent])

  const recordDisabledReason = useMemo(() => {
    if (!ready || !stream || !recorder.supported) return undefined
    if (storagePercent >= 90) return getStrings(locale).maxVideosReached
    return undefined
  }, [ready, stream, recorder.supported, storagePercent, locale])

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
        try { URL.revokeObjectURL(take.url) } catch { /* ignore */ }
      }
      return prev.filter(t => t.id !== takeId)
    })
    if (persistVideos) {
      videoStorage.deleteVideo(takeId)
        .then(() => refreshStorageQuota())
        .catch(e => console.error('Failed to delete video:', e))
    }
  }, [persistVideos, refreshStorageQuota])

  const onClearAllTakes = useCallback(() => {
    setTakes((prev) => {
      prev.forEach(take => { try { URL.revokeObjectURL(take.url) } catch { /* ignore */ } })
      return []
    })
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TAKE_NUMBER_STORAGE_KEY, '1')
    }
    if (persistVideos) {
      videoStorage.clearAllVideos()
        .then(() => refreshStorageQuota())
        .catch(e => console.error('Failed to clear videos:', e))
    }
  }, [persistVideos, refreshStorageQuota])

  const onPersistVideosChange = useCallback(async (enabled: boolean) => {
    setPersistVideos(enabled)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PERSIST_VIDEOS_STORAGE_KEY, enabled.toString())
    }

    if (enabled) {
      // Clear existing storage first to ensure exact sync with current state
      await videoStorage.clearAllVideos()

      // Save the first 10 (most recent) videos to IndexedDB
      const videosToSave = takes
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
    await refreshStorageQuota()
  }, [takes, refreshStorageQuota])

  const onPlayTake = useCallback((takeId: string) => {
    setPlayingTakeId(takeId)
    setVideoPlaying(false)
    setVideoCurrentTime(0)
    setVideoDuration(0)
    if (prompterOpen) {
      setPrompterOpen(false)
      setPlaying(false)
    }
  }, [prompterOpen])

  const onSeekVideo = useCallback((time: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = time
    setVideoCurrentTime(time)
  }, [])

  const previewVideoFrame = useCallback((time: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = time
  }, [])

  const onCloseVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setPlayingTakeId(null)
    setVideoPlaying(false)
    setTrimMode(false)
    setTrimming(false)
  }, [])

  // Track whether Keyboard Lock API actually works (Vivaldi exposes it but it's broken)
  const keyboardLockWorking = useRef(false)

  // Keyboard Lock (Chrome/Edge): lock Escape while in fullscreen so the browser
  // doesn't intercept it — our hotkey handler closes the video instead.
  useEffect(() => {
    const keyboard = (navigator as { keyboard?: { lock: (keys: string[]) => Promise<void>; unlock: () => void } }).keyboard
    if (!keyboard) return

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        keyboard.lock(['Escape']).then(
          () => { keyboardLockWorking.current = true },
          () => { keyboardLockWorking.current = false },
        )
      } else {
        keyboard.unlock()
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      keyboard.unlock()
    }
  }, [])

  // Fallback (Safari/Vivaldi/other): browser exits fullscreen on Escape natively.
  // Close the video immediately after fullscreen exits if playback was active.
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (keyboardLockWorking.current) return
      if (!document.fullscreenElement && playingTakeId) onCloseVideo()
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [playingTakeId, onCloseVideo])

  const onToggleTrim = useCallback(() => {
    if (trimMode) {
      setTrimMode(false)
      return
    }

    if (videoDuration <= 0) {
      setTrimStart(0)
      setTrimEnd(0)
      setTrimMode(true)
      return
    }

    if (videoDuration <= MIN_TRIM_SPAN) {
      setTrimStart(0)
      setTrimEnd(videoDuration)
      setTrimMode(true)
      return
    }

    const maxStart = Math.max(0, videoDuration - MIN_TRIM_SPAN)
    let start = clamp(videoDuration * DEFAULT_TRIM_START_RATIO, 0, maxStart)
    let end = clamp(videoDuration * DEFAULT_TRIM_END_RATIO, MIN_TRIM_SPAN, videoDuration)

    if (end - start < MIN_TRIM_SPAN) {
      const midpoint = videoDuration / 2
      start = clamp(midpoint - MIN_TRIM_SPAN / 2, 0, maxStart)
      end = clamp(start + MIN_TRIM_SPAN, MIN_TRIM_SPAN, videoDuration)
    }

    setTrimStart(start)
    setTrimEnd(end)
    setTrimMode(true)
  }, [trimMode, videoDuration])

  const onConfirmTrim = useCallback(async () => {
    if (!playingTakeId) return
    const take = takes.find(t => t.id === playingTakeId)
    if (!take) return
    console.log('[Studio] Starting trim', { id: take.id, trimStart, trimEnd, mimeType: take.mimeType })
    setTrimming(true)
    if (videoRef.current) videoRef.current.pause()
    setVideoPlaying(false)
    try {
      const blob = await fetch(take.url).then(r => r.blob())
      console.log('[Studio] Fetched blob, size=', blob.size)
      const trimmed = await trimVideo(blob, trimStart, trimEnd, take.mimeType)
      if (persistVideos) {
        console.log('[Studio] Saving trimmed blob to IndexedDB')
        await videoStorage.updateVideo(take.id, trimmed)
      }
      const newUrl = URL.createObjectURL(trimmed)
      URL.revokeObjectURL(take.url)
      setTakes(prev => prev.map(t => t.id === take.id ? { ...t, url: newUrl } : t))
      setTrimMode(false)
      setVideoCurrentTime(0)
      setVideoDuration(0)
      console.log('[Studio] Trim complete')
    } catch (err) {
      console.error('[Studio] Trim failed', err)
    } finally {
      setTrimming(false)
    }
  }, [playingTakeId, takes, trimStart, trimEnd, persistVideos])

  const onToggleVideoPlayback = useCallback(() => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      if (videoRef.current.ended) {
        videoRef.current.currentTime = 0
        setVideoCurrentTime(0)
      }
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

    const createdAt = Date.now()
    const takeNumber = incrementTakeNumber() ?? 1
    const takeId = `take-${createdAt}`
    const newTake = { id: takeId, url, createdAt, mimeType, takeNumber }

    setTakes((prev) => {
      if (prev.some(take => take.url === url)) return prev
      return [newTake, ...prev]
    })

    // Mark as processing and remux in background
    setProcessingTakeIds((prev) => new Set(prev).add(takeId))

    fetch(url)
      .then(response => response.blob())
      .then(blob => remuxVideo(blob, mimeType))
      .then(remuxedBlob => {
        const remuxedUrl = URL.createObjectURL(remuxedBlob)
        setTakes((prev) => prev.map(t => t.id === takeId ? { ...t, url: remuxedUrl } : t))

        if (persistVideos) {
          videoStorage.saveVideo({
            id: takeId,
            blob: remuxedBlob,
            createdAt,
            mimeType,
            takeNumber
          })
            .then(() => refreshStorageQuota())
            .catch(error => console.error('Failed to save video to storage:', error))
        }
      })
      .catch(error => console.error('[Studio] Remux failed, using original:', error))
      .finally(() => {
        setProcessingTakeIds((prev) => {
          const next = new Set(prev)
          next.delete(takeId)
          return next
        })
      })
  }, [recorder.url, recorder.mimeType, incrementTakeNumber, persistVideos, refreshStorageQuota])

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

  const handleClosePrompter = useCallback(() => {
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
  }, [prompterControlsOpen])

  useHotkeys(
    useMemo(
      () => {
        const hotkeys: Record<string, () => void> = {}

        if (playingTakeId) {
          hotkeys.space = () => onToggleVideoPlayback()
          hotkeys.escape = () => {
            if (trimMode) {
              setTrimMode(false)
              return
            }
            onCloseVideo()
          }
          hotkeys.t = () => onToggleTrim()
        } else {
          hotkeys.r = () => onToggleRecord()
          hotkeys.space = () => onTogglePrompter()
          hotkeys.t = () => onToggleDrawer()
          hotkeys.m = () => {
            setMarkdownEnabled((prev) => !prev)
          }
          hotkeys.f = () => onToggleFullscreen()
          hotkeys.escape = () => {
            tooltip.clear()
            setDrawerOpen(false)
            setPlaying(false)
          }
        }

        return hotkeys
      },
      [onToggleDrawer, onTogglePrompter, onToggleRecord, prompterOpen, playingTakeId, onToggleVideoPlayback, onCloseVideo, onToggleFullscreen, prompterIsPip, handleClosePrompter, setAutoScrollEnabled, onToggleTrim, trimMode, setTrimMode]
    ),
    true
  )

  const playingTake = playingTakeId ? takes.find(t => t.id === playingTakeId) : null
  const playbackScrubber = playingTake ? (
    <VideoScrubber
      inline
      currentTime={videoCurrentTime}
      duration={videoDuration}
      onSeek={onSeekVideo}
      onPreviewSeek={previewVideoFrame}
      trimMode={trimMode}
      trimStart={trimStart}
      trimEnd={trimEnd}
      onTrimChange={(s, e) => { setTrimStart(s); setTrimEnd(e) }}
      onConfirmTrim={() => { void onConfirmTrim() }}
      trimming={trimming}
      onExitTrim={() => setTrimMode(false)}
    />
  ) : null

  return (
    <I18nProvider locale={locale}>
      <div className="fixed inset-0 overflow-hidden bg-black text-white/90">
        {playingTake ? (
          <div className="absolute inset-0 bg-black overflow-hidden">
            <video
              ref={videoRef}
              src={playingTake.url}
              className="h-full w-full object-contain scale-[1.05]"
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
              onEnded={() => {
                setVideoPlaying(false)
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) setVideoDuration(videoRef.current.duration)
              }}
            />
          </div>
        ) : (
          <StageVideo stream={stream} mirror={mirrorVideo} />
        )}

        <div className="pointer-events-none fixed left-6 top-6 z-30 flex items-center gap-2 text-white/80">
          <Tooltip
            label={
              <div className="flex flex-col gap-2">
                <div className="max-w-xs whitespace-normal rounded-lg border border-white/10 bg-black/85 px-4 py-3 text-center text-sm font-medium leading-relaxed text-white/90 shadow-glow backdrop-blur">
                  <span className="block mb-2">
                    {strings.aboutMessage.split(/(open-source|open source|código abierto|オープンソース|ओपन-सोर्स|Open-Source|开源|مفتوح المصدر|código aberto|открытым исходным кодом)/i).map((part, index) => {
                      const isOpenSource = /^(open-source|open source|código abierto|オープンソース|ओपन-सोर्स|Open-Source|开源|مفتوح المصدر|código aberto|открытым исходным кодом)$/i.test(part);
                      if (isOpenSource) {
                        return (
                          <a
                            key={index}
                            href="https://github.com/SomeoneElseSt/teleme.me"
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
                <div className="max-w-xs whitespace-normal rounded-lg border border-white/10 bg-black/85 px-4 py-3 text-center text-[11px] font-medium leading-relaxed text-white/90 shadow-glow backdrop-blur">
                  <div className="mb-2 text-sm">{strings.shortcutsTitle}:</div>
                  <ShortcutsTable menu={strings.shortcutsMenu} />
                </div>
              </div>
            }
            side="right"
            align="start"
            sideOffset={6}
            interactive
            className="!bg-transparent !border-0 !p-0 !shadow-none !backdrop-blur-none"
          >
            <div className="pointer-events-auto p-4 -m-4 rounded-3xl">
              <div className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm backdrop-blur">
                <Film className="h-4 w-4 text-white/75" />
                <span className="tracking-[-0.02em]">teleme.me</span>
              </div>
            </div>
          </Tooltip>
        </div>
        {!drawerOpen && (
          <div className="pointer-events-none fixed right-6 top-6 z-[60] flex items-center gap-2 text-white/80">
            <div
              className="pointer-events-auto relative"
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
              {/* Invisible guard to keep the hover state active when moving mouse between button and panel */}
              {localeOpen && <div className="absolute -inset-4 z-0" />}
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
                    className="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-white/10 bg-black/80 p-2 text-xs text-white/80 shadow-glow backdrop-blur"
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

        <FloatingPrompter
          open={prompterOpen}
          frame={frame}
          opacity={opacity}
          script={script}
          onScriptChange={setScript}
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
          onClose={handleClosePrompter}
          onFrameChange={onFrameChange}
          onControlsOpenChange={setPrompterControlsOpen}
          onPipChange={setPrompterIsPip}
          onMarkdownEnabledChange={setMarkdownEnabled}
          autoScrollEnabled={autoScrollEnabled}
          onAutoScrollChange={setAutoScrollEnabled}
          wpm={wpm}
          onWpmChange={setWpm}
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
          cameraEnabled={cameraEnabled}
          onCameraEnabledChange={setCameraEnabled}
          micEnabled={micEnabled}
          onMicEnabledChange={setMicEnabled}
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
          storagePercent={storagePercent}
          recordDisabledReason={recordDisabledReason}
          error={error}
          warning={isSilent ? strings.audioSilentWarningMessage : undefined}
          trimMode={trimMode}
          onToggleTrim={onToggleTrim}
          topSlot={playbackScrubber}
          processingTakeIds={processingTakeIds}
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
