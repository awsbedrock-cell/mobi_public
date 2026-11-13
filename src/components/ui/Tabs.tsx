import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'

const base = 'inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-control px-3.5 text-sm font-semibold transition-colors'
const on = 'bg-primary text-primary-fg shadow-brand'
const off = 'text-text-muted hover:bg-surface-muted hover:text-text'

export interface TabItem<T extends string = string> {
  value: T
  label: string
  icon?: ReactNode
}

/** Pill tabs that scroll horizontally on small screens. */
export function Tabs<T extends string>({ items, value, onChange, className }: { items: TabItem<T>[]; value: T; onChange: (value: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 py-1', className)}>
      {items.map((item) => (
        <button key={item.value} role="tab" type="button" aria-selected={item.value === value} onClick={() => onChange(item.value)} className={cn(base, item.value === value ? on : off)}>
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function NavTabs({ items, className }: { items: Array<{ to: string; label: string; icon?: ReactNode; end?: boolean }>; className?: string }) {
  return (
    <nav className={cn('no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 py-1', className)}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cn(base, isActive ? on : off)}>
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
