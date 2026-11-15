import { Headset, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useBrand } from '../../branding/BrandProvider'
import { getNavStyle } from '../../branding/presets'
import { cn } from '../../lib/utils'
import { IconButton } from '../ui/Button'
import { Logo } from './Logo'
import { navItems } from './nav'
import { ThemeSegmented } from './ThemeSwitcher'

function NavList({ onNavigate, compact }: { onNavigate?: () => void; compact?: boolean }) {
  const active = getNavStyle(useBrand().style.nav).active
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          title={label}
          className={({ isActive }) =>
            cn(
              'flex h-10 items-center gap-3 rounded-control px-3 text-sm font-semibold transition-colors',
              compact && 'lg:max-xl:justify-center lg:max-xl:px-0',
              isActive ? active : 'text-text-muted hover:bg-primary-soft hover:text-primary',
            )
          }
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span className={cn('truncate', compact && 'lg:max-xl:hidden')}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function HelpCard({ className }: { className?: string }) {
  return (
    <a href="mailto:support@mobi.example" className={cn('flex items-center gap-3 rounded-card border border-border bg-surface-muted p-3 transition-colors hover:border-primary', className)}>
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Headset className="h-[18px] w-[18px]" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold text-text">Need help?</span>
        <span className="block text-xs text-text-muted">Chat with support</span>
      </span>
    </a>
  )
}

/** Persistent rail: icons only on laptops (lg), full labels from xl. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[72px] shrink-0 flex-col border-r border-border bg-surface px-3 py-4 lg:flex xl:w-60">
      <div className="mb-6 flex h-10 items-center px-1 lg:max-xl:justify-center">
        <Logo className="lg:max-xl:[&>span:last-child]:hidden" />
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto">
        <NavList compact />
      </div>
      <HelpCard className="mt-4 hidden xl:flex" />
    </aside>
  )
}

/** Slide-in drawer for phones and tablets. */
export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={cn('fixed inset-0 z-50 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
      <div className={cn('absolute inset-0 bg-overlay/50 transition-opacity', open ? 'opacity-100' : 'opacity-0')} onClick={onClose} />
      <aside
        className={cn(
          'absolute inset-y-0 left-0 flex w-[min(19rem,86vw)] flex-col border-r border-border bg-surface p-4 shadow-pop transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-5 flex items-center justify-between">
          <Logo />
          <IconButton label="Close menu" onClick={onClose} tabIndex={open ? 0 : -1}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto">{open && <NavList onNavigate={onClose} />}</div>
        <div className="mt-4 space-y-3">
          <ThemeSegmented />
          <HelpCard />
        </div>
      </aside>
    </div>
  )
}
