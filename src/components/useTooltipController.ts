import { useContext, useMemo } from 'react'
import { TooltipContext } from './tooltipContext'

export function useTooltipController() {
  const { lock, unlock, clear } = useContext(TooltipContext)
  return useMemo(() => ({ lock, unlock, clear }), [lock, unlock, clear])
}
