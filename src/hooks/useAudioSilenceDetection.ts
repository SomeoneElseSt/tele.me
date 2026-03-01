import { useEffect, useRef, useState } from 'react'

const SILENCE_THRESHOLD = 3
const SILENCE_DURATION_MS = 10000
const POLL_INTERVAL_MS = 300

export function useAudioSilenceDetection(stream: MediaStream | null, isRecording: boolean): { isSilent: boolean } {
  const [isSilent, setIsSilent] = useState(false)
  const silenceSinceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!stream || !isRecording || stream.getAudioTracks().length === 0) {
      setIsSilent(false)
      silenceSinceRef.current = null
      return
    }

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256

    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    const buffer = new Uint8Array(analyser.frequencyBinCount)

    const intervalId = setInterval(() => {
      analyser.getByteTimeDomainData(buffer)

      const maxDeviation = buffer.reduce((max, byte) => Math.max(max, Math.abs(byte - 128)), 0)
      const currentlySilent = maxDeviation <= SILENCE_THRESHOLD

      if (currentlySilent) {
        if (silenceSinceRef.current === null) {
          silenceSinceRef.current = Date.now()
        }
        const silenceDuration = Date.now() - silenceSinceRef.current
        if (silenceDuration >= SILENCE_DURATION_MS) {
          setIsSilent(true)
        }
      } else {
        silenceSinceRef.current = null
        setIsSilent(false)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
      audioContext.close()
    }
  }, [stream, isRecording])

  return { isSilent }
}
