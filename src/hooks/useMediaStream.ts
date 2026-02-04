import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type UseMediaStreamArgs = {
  audioDeviceId?: string
  videoDeviceId?: string
  facingMode?: 'user' | 'environment'
}

export function useMediaStream({ audioDeviceId, videoDeviceId, facingMode }: UseMediaStreamArgs) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | undefined>(undefined)
  const [ready, setReady] = useState(false)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const supported = useMemo(() => Boolean(navigator.mediaDevices?.getUserMedia), [])

  const stop = useCallback(() => {
    setStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop())
      return null
    })
  }, [])

  const start = useCallback(async () => {
    if (!supported) {
      setReady(true)
      setError('Camera capture is not supported in this browser.')
      return
    }
    setReady(false)
    setError(undefined)
    stop()

    const constraints: MediaStreamConstraints = {
      audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      video: videoDeviceId 
        ? { 
            deviceId: { exact: videoDeviceId },
            width: { min: 1280, ideal: 1920 },
            height: { min: 720, ideal: 1080 }
          }
        : facingMode 
          ? { 
              facingMode,
              width: { min: 1280, ideal: 1920 },
              height: { min: 720, ideal: 1080 }
            }
          : {
              width: { min: 1280, ideal: 1920 },
              height: { min: 720, ideal: 1080 }
            }
    }

    const next = await navigator.mediaDevices.getUserMedia(constraints).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to start camera.'
      setError(message)
      setReady(true)
      return null
    })
    if (!next) return

    if (!mountedRef.current) {
      next.getTracks().forEach((t) => t.stop())
      return
    }

    setStream(next)
    setReady(true)
  }, [audioDeviceId, facingMode, stop, supported, videoDeviceId])

  useEffect(() => {
    void start()
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioDeviceId, videoDeviceId, facingMode])

  return { stream, supported, ready, error, start, stop }
}
