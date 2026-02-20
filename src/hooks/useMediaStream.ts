import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type UseMediaStreamArgs = {
  audioDeviceId?: string
  videoDeviceId?: string
  audioEnabled?: boolean
  videoEnabled?: boolean
  facingMode?: 'user' | 'environment'
  braveBlockedMessage?: string
}

export function useMediaStream({ audioDeviceId, videoDeviceId, audioEnabled = true, videoEnabled = true, facingMode, braveBlockedMessage }: UseMediaStreamArgs) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | undefined>(undefined)
  const [isBraveBlocked, setIsBraveBlocked] = useState(false)
  const [ready, setReady] = useState(false)

  const displayError = useMemo(() => {
    if (!error) return undefined
    if (isBraveBlocked) return braveBlockedMessage || error
    return error
  }, [error, isBraveBlocked, braveBlockedMessage])

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
      setIsBraveBlocked(false)
      return
    }
    if (!audioEnabled && !videoEnabled) {
      stop()
      setReady(true)
      return
    }

    setReady(false)
    setError(undefined)
    setIsBraveBlocked(false)
    stop()

    // Add a tiny delay to prevent UI jitter if getUserMedia fails instantly
    await new Promise((resolve) => setTimeout(resolve, 100))

    const audioConstraint: MediaStreamConstraints['audio'] = !audioEnabled
      ? false
      : audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true

    const videoConstraint: MediaStreamConstraints['video'] = !videoEnabled
      ? false
      : videoDeviceId
        ? { deviceId: { exact: videoDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        : facingMode
          ? { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { width: { ideal: 1920 }, height: { ideal: 1080 } }

    const constraints: MediaStreamConstraints = { audio: audioConstraint, video: videoConstraint }

    const next = await navigator.mediaDevices.getUserMedia(constraints).catch((err: unknown) => {
      let message = err instanceof Error ? err.message : 'Failed to start camera.'

      // Device in use by another tab (NotFoundError)
      if (message.includes('NotFoundError') || message.toLowerCase().includes('requested device not found')) {
        message = 'Close other tabs using the microphone or camera'
      }

      // Specifically handle Brave browser permissions issues
      // @ts-ignore - Navigator.brave is Brave-specific
      const isBrave = Boolean(navigator.brave && typeof navigator.brave.isBrave === 'function')
      const isBlocked = isBrave && (message.includes('denied') || (typeof message === 'string' && message.toLowerCase().includes('allowed')))

      setError(message)
      setIsBraveBlocked(isBlocked)
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
  }, [audioDeviceId, audioEnabled, facingMode, stop, supported, videoDeviceId, videoEnabled])

  useEffect(() => {
    void start()
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioDeviceId, videoDeviceId, audioEnabled, videoEnabled, facingMode])

  return { stream, supported, ready, error: displayError, start, stop }
}
