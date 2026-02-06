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
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
        : facingMode
          ? {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
          : {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
    }

    const next = await navigator.mediaDevices.getUserMedia(constraints).catch((err: unknown) => {
      let message = err instanceof Error ? err.message : 'Failed to start camera.'

      // Specifically handle Brave browser permissions issues
      // @ts-ignore - Navigator.brave is Brave-specific
      const isBrave = Boolean(navigator.brave && typeof navigator.brave.isBrave === 'function')
      if (isBrave && (message.includes('denied') || (typeof message === 'string' && message.toLowerCase().includes('allowed')))) {
        message = 'Brave blocked camera access. Click the Shields icon or the Lock icon in the address bar to reset permissions and disable Fingerprinting Protection for this site.'
      }

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
