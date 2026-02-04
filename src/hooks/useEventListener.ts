import { useEffect, useRef } from 'react'

export function useEventListener<K extends keyof WindowEventMap>(
  type: K,
  listener: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
) {
  const listenerRef = useRef(listener)
  listenerRef.current = listener

  useEffect(() => {
    const handler = (event: WindowEventMap[K]) => listenerRef.current(event)
    window.addEventListener(type, handler, options)
    return () => window.removeEventListener(type, handler, options)
  }, [type, options])
}

