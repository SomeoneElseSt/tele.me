import type { PropsWithChildren } from 'react'
import { cn } from '../lib/cn'

type Props = PropsWithChildren<{
  className?: string
}>

export function Panel({ className, children }: Props) {
  return <section className={cn('glass rounded-2xl shadow-glow', className)}>{children}</section>
}

