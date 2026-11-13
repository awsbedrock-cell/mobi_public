import { Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { navItems } from './nav'

const primary = ['/', '/pos', '/products', '/ecommerce']

/** Thumb-reachable navigation for phones; everything else lives in the drawer. */
export function BottomNav({ onMore }: { onMore: () => void }) {
  const items = navItems.filter((item) => primary.includes(item.to))
  const cell = 'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors'
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {items.map(({ to, short, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => cn(cell, isActive ? 'text-primary' : 'text-text-muted')}>
          {({ isActive }) => (
            <>
              <span className={cn('inline-flex h-7 w-12 items-center justify-center rounded-full', isActive && 'bg-primary-soft')}>
                <Icon className="h-5 w-5" />
              </span>
              {short}
            </>
          )}
        </NavLink>
      ))}
      <button type="button" onClick={onMore} className={cn(cell, 'text-text-muted')}>
        <span className="inline-flex h-7 w-12 items-center justify-center">
          <Menu className="h-5 w-5" />
        </span>
        More
      </button>
    </nav>
  )
}
