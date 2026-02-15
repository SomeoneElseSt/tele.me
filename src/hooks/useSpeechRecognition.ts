import { useCallback, useEffect, useRef, useState } from 'react'
import type { LocaleCode } from '../features/studio/i18n'

// Constants
const SPEECH_RECOGNITION_LANGS: Record<LocaleCode, string> = {
  'en': 'en-US',
  'es': 'es-ES',
  'ja': 'ja-JP',
  'hi': 'hi-IN',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'zh': 'zh-CN',
  'ar': 'ar-SA',
  'pt': 'pt-BR',
  'ru': 'ru-RU',
  'pl': 'pl-PL'
}

const INTERIM_RESULTS_ENABLED = true
const CONTINUOUS_MODE = true
const MAX_RETRIES = 3
const MIN_RETRY_DELAY_MS = 1000
const MAX_RETRY_DELAY_MS = 5000

type UseSpeechRecognitionArgs = {
  enabled: boolean
  locale: LocaleCode
  onTranscript: (text: string, isFinal: boolean) => void
  onError?: (error: string) => void
}

type UseSpeechRecognitionReturn = {
  supported: boolean
  active: boolean
  error: string | undefined
  start: () => void
  stop: () => void
}

export function useSpeechRecognition({
  enabled,
  locale,
  onTranscript,
  onError
}: UseSpeechRecognitionArgs): UseSpeechRecognitionReturn {
  const [supported, setSupported] = useState(false)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const recognitionRef = useRef<any>(null)
  const enabledRef = useRef(enabled)
  const mountedRef = useRef(true)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<number | null>(null)
  const hasReceivedSpeechRef = useRef(false)

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSupported(Boolean(SpeechRecognition))
  }, [])

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore errors during cleanup
      }
      recognitionRef.current = null
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    setActive(false)
  }, [])

  const start = useCallback(() => {
    if (!supported) {
      const msg = 'Speech recognition not supported in this browser'
      setError(msg)
      onError?.(msg)
      return
    }

    if (recognitionRef.current) {
      cleanup()
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = CONTINUOUS_MODE
    recognition.interimResults = INTERIM_RESULTS_ENABLED
    recognition.lang = SPEECH_RECOGNITION_LANGS[locale] || 'en-US'

    recognition.onstart = () => {
      if (!mountedRef.current) return
      console.log('[ASR] Speech recognition started, locale:', SPEECH_RECOGNITION_LANGS[locale])
      setActive(true)
      setError(undefined)
      hasReceivedSpeechRef.current = false
      retryCountRef.current = 0
    }

    recognition.onresult = (event: any) => {
      if (!mountedRef.current) return

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result) continue

        const transcript = result[0]?.transcript
        if (!transcript) continue

        const isFinal = result.isFinal
        console.log('[ASR] Transcript:', transcript, 'isFinal:', isFinal, 'confidence:', result[0]?.confidence)
        hasReceivedSpeechRef.current = true
        onTranscript(transcript, isFinal)
      }
    }

    recognition.onerror = (event: any) => {
      if (!mountedRef.current) return

      const errorMsg = `Speech recognition error: ${event.error}`
      console.log('[ASR] Error event:', event.error)

      // Don't set error for 'no-speech' - it's expected during pauses
      if (event.error === 'no-speech') {
        return
      }

      // Don't set error for 'aborted' - happens on manual stop
      if (event.error === 'aborted') {
        return
      }

      console.log('[ASR] Setting error state:', errorMsg)
      setError(errorMsg)
      onError?.(errorMsg)

      // Retry with exponential backoff
      if (retryCountRef.current < MAX_RETRIES) {
        const delay = Math.min(
          MIN_RETRY_DELAY_MS * Math.pow(2, retryCountRef.current),
          MAX_RETRY_DELAY_MS
        )

        retryCountRef.current++

        retryTimeoutRef.current = window.setTimeout(() => {
          if (!mountedRef.current) return
          if (!enabled) return

          start()
        }, delay)
      }
    }

    recognition.onend = () => {
      if (!mountedRef.current) return

      // Only auto-restart if we received speech (normal ~60s timeout)
      // Don't restart if it ended immediately (permission/device issues)
      if (enabledRef.current && hasReceivedSpeechRef.current && retryCountRef.current < MAX_RETRIES) {
        const delay = 100
        console.log('[ASR] Recognition timed out after speech, auto-restarting...')
        retryTimeoutRef.current = window.setTimeout(() => {
          if (!mountedRef.current) return
          if (!enabledRef.current) return
          start()
        }, delay)
      } else {
        console.log('[ASR] Recognition ended, no auto-restart (hasSpoken:', hasReceivedSpeechRef.current, 'enabled:', enabledRef.current, ')')
        setActive(false)
      }
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start speech recognition'
      setError(msg)
      onError?.(msg)
    }
  }, [supported, enabled, locale, onTranscript, onError, cleanup])

  const stop = useCallback(() => {
    cleanup()
  }, [cleanup])

  // Keep enabledRef in sync for closure access
  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  // Mount/unmount lifecycle
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [cleanup])

  // Start/stop based on enabled prop
  useEffect(() => {
    if (enabled) {
      start()
    } else {
      stop()
    }
  }, [enabled, start, stop])

  return {
    supported,
    active,
    error,
    start,
    stop
  }
}
