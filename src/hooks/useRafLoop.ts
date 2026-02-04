import { useEffect, useRef } from 'react'

export function useRafLoop(callback: (deltaMs: number) => void, enabled: boolean) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const lastTsRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts
      const delta = ts - lastTsRef.current
      lastTsRef.current = ts
      callbackRef.current(delta)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
    }
  }, [enabled])
}

