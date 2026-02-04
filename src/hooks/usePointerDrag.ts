import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

type Point = { x: number; y: number }

type DragState = {
  pointerId: number
  start: Point
  origin: Point
}

type Args = {
  enabled: boolean
  getOrigin: () => Point
  onMove: (next: Point) => void
  onEnd?: () => void
}

export function usePointerDrag({ enabled, getOrigin, onMove, onEnd }: Args) {
  const enabledRef = useRef(enabled)
  const getOriginRef = useRef(getOrigin)
  const onMoveRef = useRef(onMove)
  const onEndRef = useRef(onEnd)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])
  useEffect(() => {
    getOriginRef.current = getOrigin
  }, [getOrigin])
  useEffect(() => {
    onMoveRef.current = onMove
  }, [onMove])
  useEffect(() => {
    onEndRef.current = onEnd
  }, [onEnd])

  const stateRef = useRef<DragState | null>(null)

  const onPointerMove = useCallback((event: PointerEvent) => {
    if (!enabledRef.current) return
    const state = stateRef.current
    if (!state) return
    if (event.pointerId !== state.pointerId) return

    const dx = event.clientX - state.start.x
    const dy = event.clientY - state.start.y
    onMoveRef.current({ x: state.origin.x + dx, y: state.origin.y + dy })
  }, [])

  const onPointerUp = useCallback((event: PointerEvent) => {
    const state = stateRef.current
    if (!state) return
    if (event.pointerId !== state.pointerId) return
    stateRef.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    onEndRef.current?.()
  }, [onPointerMove])

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [onPointerMove, onPointerUp])

  const onPointerDown = useCallback((event: ReactPointerEvent) => {
    if (!enabledRef.current) return
    if (event.button !== 0) return

    event.preventDefault()
    const origin = getOriginRef.current()
    stateRef.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }, [onPointerMove, onPointerUp])

  return { onPointerDown }
}
