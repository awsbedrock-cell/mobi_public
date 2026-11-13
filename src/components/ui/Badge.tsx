import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'neutral'

const tones: Record<Tone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-error-soft text-error',
  info: 'bg-info-soft text-info',
  primary: 'bg-primary-soft text-primary',
  neutral: 'bg-surface-muted text-text-muted',
}

const dots: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  primary: 'bg-primary',
  neutral: 'bg-text-subtle',
}

export function Badge({ tone = 'neutral', dot = true, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone])} />}
      {children}
    </span>
  )
}
