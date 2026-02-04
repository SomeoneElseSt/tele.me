import { useContext } from 'react'
import { TooltipContext } from './tooltipContext'

export function useTooltipController() {
  const { lock, unlock, clear } = useContext(TooltipContext)
  return { lock, unlock, clear }
}
