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
  unsupported: boolean
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
  const [unsupported, setUnsupported] = useState(false)

  const recognitionRef = useRef<any>(null)
  const enabledRef = useRef(enabled)
  const mountedRef = useRef(true)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<number | null>(null)
  const hasReceivedSpeechRef = useRef(false)

  // Check browser support and test instantiation
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSupported(false)
      setUnsupported(true)
      return
    }

    // Try to actually start it to verify it works (triggers network call)
    let test: any = null
    let abortTimeout: number | null = null

    try {
      test = new SpeechRecognition()

      // Configure the same way as real usage to trigger same errors
      test.continuous = true
      test.interimResults = true
      test.lang = 'en-US'

      test.onerror = (event: any) => {
        console.log('[ASR] Early check error:', event.error)
        const persistentErrors = ['network', 'service-not-available', 'bad-grammar', 'not-allowed']
        if (persistentErrors.includes(event.error)) {
          setUnsupported(true)
          setError(`Speech recognition error: ${event.error}`)
          if (abortTimeout) clearTimeout(abortTimeout)
          try { test.abort() } catch {}
        }
      }

      test.onstart = () => {
        // Wait 3000ms to see if network error occurs before considering it successful
        abortTimeout = window.setTimeout(() => {
          try { test.abort() } catch {}
        }, 3000)
      }

      test.start()
      setSupported(true)
    } catch (err) {
      setSupported(false)
      setUnsupported(true)
      setError('Speech recognition not available')
    }

    // Cleanup timeout on unmount
    return () => {
      if (abortTimeout) clearTimeout(abortTimeout)
      if (test) {
        try { test.abort() } catch {}
      }
    }
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
        hasReceivedSpeechRef.current = true
        onTranscript(transcript, isFinal)
      }
    }

    recognition.onerror = (event: any) => {
      if (!mountedRef.current) return

      const errorMsg = `Speech recognition error: ${event.error}`

      // Don't set error for 'no-speech' - it's expected during pauses
      if (event.error === 'no-speech') {
        return
      }

      // Don't set error for 'aborted' - happens on manual stop
      if (event.error === 'aborted') {
        return
      }

      // Detect persistent unsupported errors
      const persistentErrors = ['network', 'service-not-available', 'bad-grammar', 'not-allowed']
      const isPersistentError = persistentErrors.includes(event.error)

      setError(errorMsg)

      if (isPersistentError) {
        setUnsupported(true)
        onError?.(errorMsg)
        return
      }

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
        retryTimeoutRef.current = window.setTimeout(() => {
          if (!mountedRef.current) return
          if (!enabledRef.current) return
          start()
        }, delay)
      } else {
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
    unsupported,
    start,
    stop
  }
}
