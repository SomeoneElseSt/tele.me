import { useState, useEffect } from 'react'

/**
 * A custom hook to manage state in localStorage with validation and SSR safety.
 * Handles both JSON-serialized values and raw strings for backward compatibility.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  validate?: (value: any) => T
) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue

    const saved = window.localStorage.getItem(key)
    if (saved === null) return defaultValue

    try {
      const parsed = JSON.parse(saved)
      if (validate) return validate(parsed)
      return parsed as T
    } catch {
      // Fallback for values that aren't valid JSON (e.g. legacy raw strings)
      if (validate) return validate(saved)
      return (saved as unknown) as T
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const valueToStore = typeof state === 'string' ? state : JSON.stringify(state)
    window.localStorage.setItem(key, valueToStore)
  }, [key, state])

  return [state, setState] as const
}
