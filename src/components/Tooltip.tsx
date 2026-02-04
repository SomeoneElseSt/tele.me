import { AnimatePresence, motion } from 'framer-motion'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import {
  createContext,
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

type Side = 'top' | 'bottom'

type TooltipProps = {
  label: string
  shortcut?: string
  side?: Side
  sideOffset?: number
  children: ReactNode
}

type TooltipState = {
  enabled: boolean
  activeId: string | null
  setActiveId: Dispatch<SetStateAction<string | null>>
}

const noopSetActiveId: Dispatch<SetStateAction<string | null>> = () => undefined

const TooltipContext = createContext<TooltipState>({
  enabled: true,
  activeId: null,
  setActiveId: noopSetActiveId
})

export function TooltipProvider({ enabled = true, children }: { enabled?: boolean; children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const value = useMemo(() => ({ enabled, activeId, setActiveId }), [activeId, enabled])
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

export function Tooltip({ label, shortcut, side = 'top', sideOffset = 14, children }: TooltipProps) {
  const id = useId()
  const { enabled, activeId, setActiveId } = useContext(TooltipContext)
  const [hovered, setHovered] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const [tipWidth, setTipWidth] = useState<number | null>(null)

  const text = useMemo(() => formatLabel(label, shortcut), [label, shortcut])
  const show = enabled && Boolean(label)
  const open = show && hovered && activeId === id

  const updatePosition = useCallback(() => {
    if (!show) return
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = side === 'top' ? rect.top - sideOffset : rect.bottom + sideOffset
    setPos({ x, y })
  }, [show, side, sideOffset])

  useLayoutEffect(() => {
    if (!open) return
    const el = tipRef.current
    if (!el) return
    setTipWidth(el.getBoundingClientRect().width)
  }, [open, text])

  useEffect(() => {
    if (!hovered) return
    if (!show) return
    setActiveId(id)
    return () => {
      setActiveId((prev) => (prev === id ? null : prev))
    }
  }, [hovered, id, setActiveId, show])

  useEffect(() => {
    if (!open) return
    updatePosition()

    const onScroll = () => updatePosition()
    const onResize = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, updatePosition])

  const margin = 10
  const xClamped = useMemo(() => {
    if (!pos) return null
    if (!tipWidth) return pos.x
    const half = tipWidth / 2
    return clamp(pos.x, margin + half, window.innerWidth - margin - half)
  }, [pos, tipWidth])

  const onOpen = useCallback(() => {
    if (!show) return
    updatePosition()
    setHovered(true)
  }, [show, updatePosition])

  const onClose = useCallback(() => {
    setHovered(false)
    setActiveId((prev) => (prev === id ? null : prev))
  }, [id, setActiveId])

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
            {open && pos && (
              <motion.div
                ref={tipRef}
                className="pointer-events-none fixed z-[120] select-none whitespace-nowrap rounded-lg border border-white/10 bg-black/85 px-2.5 py-1.5 text-[11px] font-medium text-white/90 shadow-glow backdrop-blur"
                style={{
                  left: xClamped ?? pos.x,
                  top: pos.y,
                  transform: side === 'top' ? 'translate3d(-50%, -100%, 0)' : 'translate3d(-50%, 0, 0)'
                }}
                initial={{ opacity: 0, y: side === 'top' ? 6 : -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: side === 'top' ? 6 : -6, scale: 0.98 }}
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
