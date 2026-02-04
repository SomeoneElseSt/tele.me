import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { createPortal } from 'react-dom'
import { TooltipContext } from './tooltipContext'

type Side = 'top' | 'bottom' | 'left' | 'right'
type SideOrAuto = Side | 'auto'

type TooltipProps = {
  label: string
  shortcut?: string
  tooltipId?: string
  side?: SideOrAuto
  preferSide?: Side
  sideOffset?: number
  children: ReactNode
}

export function TooltipProvider({ enabled = true, children }: { enabled?: boolean; children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [lockedId, setLockedId] = useState<string | null>(null)

  const requestActive = useCallback(
    (id: string) => {
      if (lockedId && lockedId !== id) return
      setActiveId(id)
    },
    [lockedId]
  )

  const releaseActive = useCallback((id: string) => {
    setActiveId((prev) => (prev === id ? null : prev))
  }, [])

  const lock = useCallback((id: string) => {
    setLockedId(id)
    setActiveId(id)
  }, [])

  const unlock = useCallback((id: string) => {
    setLockedId((prev) => (prev === id ? null : prev))
    setActiveId((prev) => (prev === id ? null : prev))
  }, [])

  const clear = useCallback(() => {
    setLockedId(null)
    setActiveId(null)
  }, [])

  const value = useMemo(
    () => ({ enabled, activeId, lockedId, requestActive, releaseActive, lock, unlock, clear }),
    [activeId, clear, enabled, lockedId, lock, releaseActive, requestActive, unlock]
  )
  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>
}

function clamp(value: number, min: number, max: number) {
  if (value < min) return min
  if (value > max) return max
  return value
}

function formatLabel(label: string, shortcut?: string) {
  if (!shortcut) return label
  return `${label} (${shortcut})`
}

export function Tooltip({
  label,
  shortcut,
  tooltipId,
  side = 'top',
  preferSide,
  sideOffset = 14,
  children
}: TooltipProps) {
  const reactId = useId()
  const id = tooltipId ?? reactId
  const { enabled, activeId, lockedId, requestActive, releaseActive } = useContext(TooltipContext)
  const [hovered, setHovered] = useState(false)
  const [anchor, setAnchor] = useState<{
    left: number
    right: number
    top: number
    bottom: number
    cx: number
    cy: number
  } | null>(null)
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const [tipSize, setTipSize] = useState<{ width: number; height: number } | null>(null)
  const lastAnchorRef = useRef<{ cx: number; cy: number } | null>(null)

  const text = useMemo(() => formatLabel(label, shortcut), [label, shortcut])
  const show = enabled && Boolean(label)
  const locked = lockedId === id
  const open = show && (locked || (hovered && activeId === id))

  const updatePosition = useCallback(() => {
    if (!show) return
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return
    const next = {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2
    }
    const last = lastAnchorRef.current
    lastAnchorRef.current = { cx: next.cx, cy: next.cy }
    if (!last) {
      setAnchor(next)
      return
    }
    const dx = Math.abs(last.cx - next.cx)
    const dy = Math.abs(last.cy - next.cy)
    const changed = dx > 0.25 || dy > 0.25
    if (!changed) return
    setAnchor(next)
  }, [show])

  useLayoutEffect(() => {
    if (!open) return
    const el = tipRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTipSize({ width: rect.width, height: rect.height })
  }, [open, text])

  useEffect(() => {
    if (!hovered) return
    if (!show) return
    requestActive(id)
    return () => {
      releaseActive(id)
    }
  }, [hovered, id, releaseActive, requestActive, show])

  useEffect(() => {
    if (!open) return
    updatePosition()

    const onScroll = () => updatePosition()
    const onResize = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    let rafId = 0
    const loop = () => {
      updatePosition()
      rafId = window.requestAnimationFrame(loop)
    }
    rafId = window.requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      window.cancelAnimationFrame(rafId)
    }
  }, [open, updatePosition])

  const margin = 10

  const placement = useMemo(() => {
    if (!anchor) return null
    if (!tipSize) return null

    const vw = document.documentElement.clientWidth || window.innerWidth
    const vh = document.documentElement.clientHeight || window.innerHeight
    const preferredOverflowTolerance = 24

    const desired = (s: Side) => {
      let left = 0
      let top = 0
      if (s === 'top') {
        left = anchor.cx - tipSize.width / 2
        top = anchor.top - sideOffset - tipSize.height
      } else if (s === 'bottom') {
        left = anchor.cx - tipSize.width / 2
        top = anchor.bottom + sideOffset
      } else if (s === 'left') {
        left = anchor.left - sideOffset - tipSize.width
        top = anchor.cy - tipSize.height / 2
      } else {
        left = anchor.right + sideOffset
        top = anchor.cy - tipSize.height / 2
      }
      return { left, top }
    }

    const calc = (s: Side) => {
      const pos = desired(s)

      // Score by how much it would overflow the viewport margins.
      const overflowX =
        Math.max(0, margin - pos.left) +
        Math.max(0, pos.left + tipSize.width - (vw - margin))
      const overflowY =
        Math.max(0, margin - pos.top) +
        Math.max(0, pos.top + tipSize.height - (vh - margin))
      const overflow = overflowX + overflowY

      return { side: s, left: pos.left, top: pos.top, overflow }
    }

    const preferred: Side = side === 'auto' ? (preferSide ?? 'top') : side
    const all: Side[] = ['top', 'bottom', 'left', 'right']
    const ordered: Side[] = [preferred, ...all.filter((s) => s !== preferred)]
    const scored = ordered.map(calc)
    scored.sort((a, b) => a.overflow - b.overflow)

    const best = scored[0]
    if (!best) return null
    const preferredScore = calc(preferred)
    const chosen =
      preferredScore.overflow <= preferredOverflowTolerance ? preferred : best.side
    const final = calc(chosen)

    // Final clamp to keep it inside margins when possible.
    const leftClamped = clamp(final.left, margin, vw - margin - tipSize.width)
    const topClamped = clamp(final.top, margin, vh - margin - tipSize.height)

    return { side: final.side, left: leftClamped, top: topClamped }
  }, [anchor, margin, preferSide, side, sideOffset, tipSize])

  const onOpen = useCallback(() => {
    if (!show) return
    if (!anchorRef.current) return
    updatePosition()
    updatePosition()
    setHovered(true)
  }, [show, updatePosition])

  const onClose = useCallback(() => {
    setHovered(false)
    if (locked) return
    releaseActive(id)
  }, [id, locked, releaseActive])

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex"
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
        onFocus={onOpen}
        onBlur={onClose}
      >
        {children}
      </span>
      {show &&
        createPortal(
          <AnimatePresence>
            {open && anchor && (
              <motion.div
                ref={tipRef}
                className="pointer-events-none fixed z-[120] select-none whitespace-nowrap rounded-lg border border-white/10 bg-black/85 px-2.5 py-1.5 text-[11px] font-medium text-white/90 shadow-glow backdrop-blur"
                style={{
                  left: placement?.left ?? -9999,
                  top: placement?.top ?? -9999
                }}
                initial={{
                  opacity: 0,
                  y:
                    (placement?.side ?? (side === 'auto' ? (preferSide ?? 'top') : side)) === 'top'
                      ? 6
                      : (placement?.side ?? (side === 'auto' ? (preferSide ?? 'top') : side)) === 'bottom'
                        ? -6
                        : 0,
                  x:
                    (placement?.side ?? (side === 'auto' ? (preferSide ?? 'top') : side)) === 'left'
                      ? 6
                      : (placement?.side ?? (side === 'auto' ? (preferSide ?? 'top') : side)) === 'right'
                        ? -6
                        : 0,
                  scale: 0.98
                }}
                animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  y:
                    (placement?.side ?? (side === 'auto' ? (preferSide ?? 'top') : side)) === 'top'
                      ? 6
                      : (placement?.side ?? (side === 'auto' ? (preferSide ?? 'top') : side)) === 'bottom'
                        ? -6
                        : 0,
                  x:
                    (placement?.side ?? (side === 'auto' ? (preferSide ?? 'top') : side)) === 'left'
                      ? 6
                      : (placement?.side ?? (side === 'auto' ? (preferSide ?? 'top') : side)) === 'right'
                        ? -6
                        : 0,
                  scale: 0.98
                }}
                transition={{ type: 'spring', stiffness: 700, damping: 48, mass: 0.6 }}
              >
                {text}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
