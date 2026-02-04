import { useEventListener } from './useEventListener'

type HotkeyHandler = (event: KeyboardEvent) => void

function normalizeCombo(event: KeyboardEvent) {
  const parts: string[] = []
  if (event.ctrlKey) parts.push('ctrl')
  if (event.metaKey) parts.push('meta')
  if (event.altKey) parts.push('alt')

  const key =
    event.key === ' ' ? 'space' : event.key.startsWith('Arrow') ? event.key.toLowerCase() : event.key.toLowerCase()

  const includeShift = key.length > 1
  if (event.shiftKey && includeShift) parts.push('shift')
  parts.push(key)
  return parts.join('+')
}

export function useHotkeys(bindings: Record<string, HotkeyHandler>, enabled = true) {
  useEventListener(
    'keydown',
    (event) => {
      if (!enabled) return
      const target = event.target as HTMLElement | null
      const isTypingTarget =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        (target?.getAttribute('contenteditable') ?? 'false') === 'true'

      const combo = normalizeCombo(event)
      const handler = bindings[combo]
      if (!handler) return

      if (isTypingTarget && combo !== 'escape') return
      if (!isTypingTarget) event.preventDefault()
      handler(event)
    },
    { passive: false }
  )
}
