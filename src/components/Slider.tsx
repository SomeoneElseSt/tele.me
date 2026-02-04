import { cn } from '../lib/cn'

type Props = {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

export function Slider({ value, min, max, step = 1, onChange }: Props) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        'h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 outline-none',
        '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
        '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/85 [&::-webkit-slider-thumb]:shadow',
        '[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/30',
        '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110',
        '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white/85',
        '[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white/30'
      )}
    />
  )
}

