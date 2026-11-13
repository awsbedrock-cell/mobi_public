import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-btn-primary text-btn-primary-fg shadow-brand hover:bg-btn-primary-hover',
  secondary: 'bg-btn-secondary text-btn-secondary-fg hover:bg-btn-secondary-hover',
  outline: 'border border-border-strong bg-surface text-text hover:border-primary hover:text-primary',
  ghost: 'text-text-muted hover:bg-surface-muted hover:text-text',
  danger: 'bg-btn-danger text-btn-danger-fg hover:opacity-90',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-5 text-sm',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  block?: boolean
}

export function Button({ variant = 'primary', size = 'md', icon, iconRight, block, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-control font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  tone?: 'default' | 'danger' | 'primary'
  bordered?: boolean
}

export function IconButton({ label, tone = 'default', bordered, className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control transition-colors disabled:opacity-50',
        tone === 'default' && 'text-text-muted hover:bg-surface-muted hover:text-text',
        tone === 'danger' && 'text-error hover:bg-error-soft',
        tone === 'primary' && 'text-primary hover:bg-primary-soft',
        bordered && 'border border-border bg-surface',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
