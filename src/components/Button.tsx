import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({ className, variant = 'primary', size = 'md', ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-0',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'md' ? 'h-10 px-4' : 'h-9 px-3',
        variant === 'primary' &&
          'bg-white/10 border-white/15 text-white hover:bg-white/14 hover:border-white/20 active:scale-[0.99]',
        variant === 'ghost' &&
          'bg-transparent border-white/10 text-white/85 hover:bg-white/6 hover:text-white active:scale-[0.99]',
        className
      )}
      {...props}
    />
  )
}

