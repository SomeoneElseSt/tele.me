import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type RecorderState = {
  status: 'idle' | 'recording' | 'stopped' | 'error'
  error?: string
  elapsedMs: number
  blob?: Blob
  url?: string
  mimeType?: string
}

const DATA_TIMESLICE_MS = 250
const ELAPSED_TICK_MS = 100

function pickMimeType() {
  const candidates = [
    'video/mp4;codecs=avc1,mp4a',        // MP4 H.264 + AAC (Chrome 120+)
    'video/mp4',                          // MP4 fallback
    'video/webm;codecs=vp9,opus',        // WebM VP9 (fallback)
    'video/webm;codecs=vp8,opus',        // WebM VP8 (fallback)
    'video/webm'                          // WebM generic
  ]
  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported?.(mimeType)) return mimeType
  }
  return undefined
}

function createRecorder(stream: MediaStream) {
  const mimeType = pickMimeType()
  try {
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    return { ok: true as const, recorder }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start recorder.'
    return { ok: false as const, error: message }
  }
}

export function useRecorder(stream: MediaStream | null) {
  const [state, setState] = useState<RecorderState>({ status: 'idle', elapsedMs: 0 })
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const startTsRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)

  const supported = useMemo(() => Boolean(window.MediaRecorder), [])

  const reset = useCallback(() => {
    // Don't revoke URL here - let takes manage their own URLs
    chunksRef.current = []
    startTsRef.current = null
    setState((prev) => ({ ...prev, status: 'idle', elapsedMs: 0, url: undefined, blob: undefined }))
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current != null) window.clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  const start = useCallback(() => {
    if (!supported) {
      setState({ status: 'error', elapsedMs: 0, error: 'Recording is not supported in this browser.' })
      return
    }
    if (!stream) {
      setState({ status: 'error', elapsedMs: 0, error: 'No active camera stream.' })
      return
    }
    if (state.status === 'recording') return
    reset()

    const created = createRecorder(stream)
    if (!created.ok) {
      setState({ status: 'error', elapsedMs: 0, error: created.error })
      return
    }

    const recorder = created.recorder
    recorderRef.current = recorder
    chunksRef.current = []
    startTsRef.current = performance.now()

    recorder.ondataavailable = (event) => {
      if (!event.data) return
      if (event.data.size <= 0) return
      chunksRef.current.push(event.data)
    }
    recorder.onerror = () => {
      setState((prev) => ({ ...prev, status: 'error', error: 'Recording failed.' }))
    }
    recorder.onstop = () => {
      stopTimer()
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
      const url = URL.createObjectURL(blob)
      setState((prev) => ({ ...prev, status: 'stopped', blob, url, mimeType: recorder.mimeType }))
    }

    recorder.start(DATA_TIMESLICE_MS)
    timerRef.current = window.setInterval(() => {
      if (startTsRef.current == null) return
      const elapsedMs = performance.now() - startTsRef.current
      setState((prev) => (prev.status === 'recording' ? { ...prev, elapsedMs } : prev))
    }, ELAPSED_TICK_MS)
    setState({ status: 'recording', elapsedMs: 0, mimeType: recorder.mimeType })
  }, [reset, state.status, stopTimer, stream, supported])

  const stop = useCallback(() => {
    if (state.status !== 'recording') return
    recorderRef.current?.stop()
  }, [state.status])

  useEffect(() => {
    return () => {
      stopTimer()
      // Don't revoke URL on cleanup - takes manage their own URLs
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
      } catch {
        // ignore
      }
    }
  }, [stopTimer])

  return { ...state, supported, start, stop, reset }
}
