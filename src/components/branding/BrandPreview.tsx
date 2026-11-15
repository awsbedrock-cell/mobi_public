import { LayoutDashboard, Package, Search, ShoppingCart, TrendingUp } from 'lucide-react'
import type { CSSProperties } from 'react'
import { brandInitials } from '../../branding/BrandProvider'
import { buildTokens, getNavStyle, type BrandStyle } from '../../branding/presets'
import { cn } from '../../lib/utils'
import { useTheme } from '../../theme/ThemeProvider'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

/** Scopes a brand style to its children by overriding the design tokens on a wrapper. */
export function BrandScope({ style, className, children }: { style: BrandStyle; className?: string; children: React.ReactNode }) {
  const { resolved } = useTheme()
  return (
    <div style={buildTokens(style, resolved) as CSSProperties} className={cn('font-sans text-text', className)}>
      {children}
    </div>
  )
}

/** Miniature app screen rendered with a brand style, without touching the live app. */
export function BrandPreview({ style, name, logo, compact }: { style: BrandStyle; name: string; logo?: string; compact?: boolean }) {
  const nav = getNavStyle(style.nav).active
  const items = [
    { label: 'Dashboard', icon: LayoutDashboard, active: true },
    { label: 'Sales (POS)', icon: ShoppingCart },
    { label: 'Products', icon: Package },
  ]
  return (
    <BrandScope style={style} className="overflow-hidden rounded-card border border-border bg-bg">
      <div className="flex">
        <div className={cn('shrink-0 border-r border-border bg-surface p-2.5', compact ? 'w-24' : 'w-36')}>
          <div className="mb-3 flex items-center gap-1.5">
            {logo ? (
              <img src={logo} alt="" className="h-6 w-6 rounded-md object-contain" />
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[9px] font-extrabold text-primary-fg">{brandInitials(name || 'Brand')}</span>
            )}
            <span className="truncate font-heading text-xs font-extrabold">{name || 'Your brand'}</span>
          </div>
          <div className="space-y-1">
            {items.map(({ label, icon: Icon, active }) => (
              <span key={label} className={cn('flex h-7 items-center gap-1.5 rounded-control px-2 text-[10px] font-semibold', active ? nav : 'text-text-muted')}>
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{label}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2.5 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-extrabold tracking-tight">Good Morning</h3>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold text-accent-fg">Offer</span>
          </div>
          <Card className="flex items-center gap-2.5 p-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <TrendingUp className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-medium text-text-muted">Sales Today</span>
              <span className="block font-heading text-sm font-extrabold">₹89,090</span>
            </span>
            <span className="ml-auto h-1.5 w-10 rounded-full bg-secondary" />
          </Card>
          {!compact && (
            <span className="flex h-8 items-center gap-1.5 rounded-control border border-field-border bg-field px-2 text-[10px] text-field-placeholder">
              <Search className="h-3 w-3" /> Search products…
            </span>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" tabIndex={-1} className="pointer-events-none h-7 px-2.5 text-[10px]">
              Primary
            </Button>
            <Button size="sm" variant="secondary" tabIndex={-1} className="pointer-events-none h-7 px-2.5 text-[10px]">
              Secondary
            </Button>
            {!compact && (
              <>
                <Badge tone="success">Paid</Badge>
                <Badge tone="warning">Low</Badge>
              </>
            )}
          </div>
        </div>
      </div>
    </BrandScope>
  )
}
