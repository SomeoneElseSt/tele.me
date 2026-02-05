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
import { cn } from '../lib/cn'
import { TooltipContext } from './tooltipContext'

type Side = 'top' | 'bottom' | 'left' | 'right'
type SideOrAuto = Side | 'auto'

type TooltipProps = {
  label: ReactNode
  shortcut?: string
  tooltipId?: string
  side?: SideOrAuto
  preferSide?: Side
  sideOffset?: number
  defaultOpen?: boolean
  onDefaultOpenDismiss?: () => void
  className?: string
  interactive?: boolean
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

function formatLabel(label: ReactNode, shortcut?: string) {
  if (!shortcut) return label
  if (typeof label !== 'string') return label
  return `${label} (${shortcut})`
}

export function Tooltip({
  label,
  shortcut,
  tooltipId,
  side = 'top',
  preferSide,
  sideOffset = 14,
  defaultOpen,
  onDefaultOpenDismiss,
  className,
  interactive,
  children
}: TooltipProps) {
  const reactId = useId()
  const id = tooltipId ?? reactId
  const { enabled, activeId, lockedId, requestActive, releaseActive } = useContext(TooltipContext)
  const [hovered, setHovered] = useState(false)
  const [forceOpen, setForceOpen] = useState(!!defaultOpen)
  const closeTimerRef = useRef<number | null>(null)

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
  const open = show && (locked || forceOpen || (hovered && activeId === id))

  useEffect(() => {
    setForceOpen(!!defaultOpen)
  }, [defaultOpen])

  useEffect(() => {
    if (forceOpen && (hovered || activeId === id) && !defaultOpen) {
      // If the user interacts with it (hovers), we can dismiss the forced state
      // But wait, maybe we only dismiss it if they hover and then LEAVE?
      // Or if they click?
      // For now, let's say if they hover it, we keep showing it (obviously), 
      // but once they leave, we might want to stop forcing it?
      // Actually, standard pattern is: show it until user interacts with the element or dismisses it.
      // Simplest: if they hover, we disable forceOpen, so it behaves normally from then on (closes on leave).
      setForceOpen(false)
      onDefaultOpenDismiss?.()
    }
  }, [hovered, activeId, id, forceOpen, defaultOpen, onDefaultOpenDismiss])

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
  }, [open, text, anchor])

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
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (!show) return
    if (!anchorRef.current) return
    if (forceOpen) {
      setForceOpen(false)
      onDefaultOpenDismiss?.()
    }
    updatePosition()
    updatePosition()
    setHovered(true)
  }, [show, updatePosition, forceOpen, onDefaultOpenDismiss])

  const onClose = useCallback(() => {
    if (interactive) {
      closeTimerRef.current = window.setTimeout(() => {
        setHovered(false)
        if (locked) return
        releaseActive(id)
      }, 150)
    } else {
      setHovered(false)
      if (locked) return
      releaseActive(id)
    }
  }, [id, locked, releaseActive, interactive])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  const tooltipHandlers = interactive ? {
    onMouseEnter: () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    },
    onMouseLeave: onClose
  } : {}

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
                className={cn(
                  "fixed z-[120] whitespace-nowrap rounded-lg border border-white/10 bg-black/85 px-2.5 py-1.5 text-[11px] font-medium text-white/90 shadow-glow backdrop-blur",
                  interactive ? "pointer-events-auto select-text" : "pointer-events-none select-none",
                  className
                )}
                {...tooltipHandlers}
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
