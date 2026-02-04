export function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min
  if (min > max) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

