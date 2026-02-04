import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Download, Mic, MonitorUp, RefreshCw, Video, VideoOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '../../components/Button'
import { IconButton } from '../../components/IconButton'
import { Panel } from '../../components/Panel'
import { cn } from '../../lib/cn'
import { useMediaDevices } from '../../hooks/useMediaDevices'
import { useMediaStream } from '../../hooks/useMediaStream'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useRecorder } from '../../hooks/useRecorder'
import { formatMs } from './format'

type Props = {
  onRequestHotkeys: () => void
}

export function RecorderPanel({ onRequestHotkeys }: Props) {
  const { audioInputs, videoInputs, refresh, error: devicesError } = useMediaDevices()
  const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>(undefined)
  const [videoDeviceId, setVideoDeviceId] = useState<string | undefined>(undefined)
  const [mirror, setMirror] = useState(true)

  const { stream, error: streamError, ready, start: restartStream } = useMediaStream({
    audioDeviceId,
    videoDeviceId,
    facingMode: 'user'
  })

  const { status, elapsedMs, url, error: recError, supported, start, stop, reset, mimeType } = useRecorder(stream)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    if (!videoRef.current) return
    videoRef.current.srcObject = stream
  }, [stream])

  useHotkeys(
    {
      r: () => (status === 'recording' ? stop() : start())
    },
    true
  )

  useEffect(() => {
    if (!audioDeviceId && audioInputs[0]?.deviceId) setAudioDeviceId(audioInputs[0].deviceId)
  }, [audioDeviceId, audioInputs])
  useEffect(() => {
    if (!videoDeviceId && videoInputs[0]?.deviceId) setVideoDeviceId(videoInputs[0].deviceId)
  }, [videoDeviceId, videoInputs])

  const canRecord = useMemo(() => ready && Boolean(stream) && supported, [ready, stream, supported])

  const error = recError ?? streamError ?? devicesError

  return (
    <Panel className="relative min-h-[720px] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-fade" />
      <div className="relative flex h-full flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 border border-white/10">
              <Video className="h-4 w-4 text-white/85" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white/90">Camera</div>
              <div className="text-xs text-white/55">Preview + record locally</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              type="button"
              title="Show hotkeys"
              aria-label="Show hotkeys"
              onClick={onRequestHotkeys}
            >
              <MonitorUp className="h-4 w-4" />
            </IconButton>
            <IconButton type="button" title="Refresh devices" aria-label="Refresh devices" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4" />
            </IconButton>
            <IconButton
              type="button"
              title="Mirror preview"
              aria-label="Mirror preview"
              active={mirror}
              onClick={() => setMirror((v) => !v)}
            >
              <Camera className="h-4 w-4" />
            </IconButton>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-xs text-white/60">Camera</span>
              <div className="relative">
                <select
                  value={videoDeviceId ?? ''}
                  onChange={(e) => setVideoDeviceId(e.target.value || undefined)}
                  className={cn(
                    'h-10 w-full appearance-none rounded-xl border bg-white/6 px-3 pr-10 text-sm text-white/85',
                    'border-white/10 focus:outline-none focus:ring-2 focus:ring-brand/70'
                  )}
                >
                  {videoInputs.length === 0 && <option value="">No cameras</option>}
                  {videoInputs.map((d, idx) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
                <Video className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              </div>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs text-white/60">Mic</span>
              <div className="relative">
                <select
                  value={audioDeviceId ?? ''}
                  onChange={(e) => setAudioDeviceId(e.target.value || undefined)}
                  className={cn(
                    'h-10 w-full appearance-none rounded-xl border bg-white/6 px-3 pr-10 text-sm text-white/85',
                    'border-white/10 focus:outline-none focus:ring-2 focus:ring-brand/70'
                  )}
                >
                  {audioInputs.length === 0 && <option value="">No mics</option>}
                  {audioInputs.map((d, idx) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Mic ${idx + 1}`}
                    </option>
                  ))}
                </select>
                <Mic className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              </div>
            </label>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn('h-full w-full object-cover', mirror && '-scale-x-100')}
            />
            {!stream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8">
                  <VideoOff className="h-5 w-5 text-white/70" />
                </div>
                <div className="text-sm font-medium text-white/80">Waiting for camera…</div>
                <div className="text-xs text-white/55">Allow permissions when prompted.</div>
              </div>
            )}
            <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/70 backdrop-blur">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  status === 'recording' ? 'bg-red-400 shadow-[0_0_0_6px_rgba(248,113,113,0.15)]' : 'bg-white/30'
                )}
              />
              <span>{status === 'recording' ? `REC • ${formatMs(elapsedMs)}` : formatMs(elapsedMs)}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => (status === 'recording' ? stop() : start())}
                disabled={!canRecord && status !== 'recording'}
                className={cn(
                  status === 'recording' &&
                    'bg-red-500/20 border-red-500/30 hover:bg-red-500/24 hover:border-red-500/40'
                )}
              >
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span
                    className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      status === 'recording' ? 'bg-red-400' : 'bg-white/70'
                    )}
                  />
                </span>
                {status === 'recording' ? 'Stop' : 'Record'}
              </Button>
              <Button type="button" variant="ghost" onClick={reset} disabled={status === 'recording'}>
                Reset
              </Button>
              <Button type="button" variant="ghost" onClick={() => void restartStream()}>
                Restart camera
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <div className="text-xs text-white/55">
                {mimeType ? <span>MIME: {mimeType}</span> : <span>Recording ready</span>}
              </div>
              {url && (
                <motion.a
                  href={url}
                  download={`teleme-${new Date().toISOString().replaceAll(':', '')}.webm`}
                  className={cn(
                    'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/8 px-4 text-sm font-medium text-white/90',
                    'hover:bg-white/10 hover:border-white/18 transition-all active:scale-[0.99]'
                  )}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </motion.a>
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
