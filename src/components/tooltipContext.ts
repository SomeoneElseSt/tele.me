import { createContext } from 'react'

export type TooltipState = {
  enabled: boolean
  activeId: string | null
  lockedId: string | null
  requestActive: (id: string) => void
  releaseActive: (id: string) => void
  lock: (id: string) => void
  unlock: (id: string) => void
  clear: () => void
}

const noop = () => undefined

export const TooltipContext = createContext<TooltipState>({
  enabled: true,
  activeId: null,
  lockedId: null,
  requestActive: noop,
  releaseActive: noop,
  lock: noop,
  unlock: noop,
  clear: noop
})
