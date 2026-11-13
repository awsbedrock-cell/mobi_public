import { ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn, initials } from '../../lib/utils'
import type { Tone } from './Badge'
import { Card } from './Card'

const iconTones: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-error-soft text-error',
  info: 'bg-info-soft text-info',
  neutral: 'bg-surface-muted text-text-muted',
}

export function IconTile({ tone = 'primary', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconTones[tone], className)}>{children}</span>
}

interface StatCardProps {
  label: string
  value: ReactNode
  icon: ReactNode
  tone?: Tone
  delta?: number
  hint?: string
}

export function StatCard({ label, value, icon, tone = 'primary', delta, hint }: StatCardProps) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <IconTile tone={tone} className="h-11 w-11">
        {icon}
      </IconTile>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-text-muted">{label}</p>
        <p className="truncate text-xl font-extrabold tracking-tight">{value}</p>
        {delta !== undefined && (
          <p className={cn('mt-0.5 inline-flex items-center gap-1 text-xs font-semibold', delta >= 0 ? 'text-success' : 'text-error')}>
            {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(delta)}% {hint}
          </p>
        )}
      </div>
    </Card>
  )
}

interface Crumb {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  crumbs?: Crumb[]
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, crumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1 text-xs font-medium text-text-muted">
            {crumbs.map((crumb, index) => (
              <span key={crumb.label} className="inline-flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-text-subtle" />}
                {crumb.to ? (
                  <Link to={crumb.to} className="text-primary hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  crumb.label
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

const avatarTones = ['bg-primary-soft text-primary', 'bg-success-soft text-success', 'bg-warning-soft text-warning', 'bg-info-soft text-info', 'bg-error-soft text-error']

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const tone = avatarTones[name.charCodeAt(0) % avatarTones.length]
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-9 w-9 text-xs', lg: 'h-14 w-14 text-lg' }
  return <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold', tone, sizes[size])}>{initials(name)}</span>
}

/** Toolbar row above tables: wraps cleanly on small screens. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center sm:p-4', className)}>{children}</div>
}
