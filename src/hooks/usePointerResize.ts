import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

type Size = { width: number; height: number }

type ResizeState = {
  pointerId: number
  startX: number
  startY: number
  origin: Size
}

type Args = {
  enabled: boolean
  getOrigin: () => Size
  onResize: (next: Size) => void
  onEnd?: () => void
}

export function usePointerResize({ enabled, getOrigin, onResize, onEnd }: Args) {
  const enabledRef = useRef(enabled)
  const getOriginRef = useRef(getOrigin)
  const onResizeRef = useRef(onResize)
  const onEndRef = useRef(onEnd)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])
  useEffect(() => {
    getOriginRef.current = getOrigin
  }, [getOrigin])
  useEffect(() => {
    onResizeRef.current = onResize
  }, [onResize])
  useEffect(() => {
    onEndRef.current = onEnd
  }, [onEnd])

  const stateRef = useRef<ResizeState | null>(null)

  const onPointerMove = useCallback((event: PointerEvent) => {
    if (!enabledRef.current) return
    const state = stateRef.current
    if (!state) return
    if (event.pointerId !== state.pointerId) return

    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    onResizeRef.current({ width: state.origin.width + dx, height: state.origin.height + dy })
  }, [])

  const onPointerUp = useCallback(
    (event: PointerEvent) => {
      const state = stateRef.current
      if (!state) return
      if (event.pointerId !== state.pointerId) return
      stateRef.current = null
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      onEndRef.current?.()
    },
    [onPointerMove]
  )

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [onPointerMove, onPointerUp])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (!enabledRef.current) return
      if (event.button !== 0) return

      event.preventDefault()
      const origin = getOriginRef.current()
      stateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origin
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
      window.addEventListener('pointercancel', onPointerUp)
    },
    [onPointerMove, onPointerUp]
  )

  return { onPointerDown }
}

