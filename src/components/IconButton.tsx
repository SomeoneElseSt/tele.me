import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
}

export function IconButton({ className, active, ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-0',
        active
          ? 'bg-white/12 border-white/20 text-white'
          : 'bg-transparent border-white/10 text-white/80 hover:bg-white/6 hover:text-white',
        'active:scale-[0.99]',
        className
      )}
      {...props}
    />
  )
}

