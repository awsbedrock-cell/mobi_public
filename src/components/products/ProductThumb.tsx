import { BatteryCharging, Headphones, ShieldCheck, Smartphone, Watch } from 'lucide-react'
import type { Product, ProductCategory } from '../../data/types'
import { cn } from '../../lib/utils'

const visuals: Record<ProductCategory, { icon: typeof Smartphone; tone: string }> = {
  Smartphones: { icon: Smartphone, tone: 'bg-primary-soft text-primary' },
  Audio: { icon: Headphones, tone: 'bg-info-soft text-info' },
  Wearables: { icon: Watch, tone: 'bg-success-soft text-success' },
  Accessories: { icon: ShieldCheck, tone: 'bg-warning-soft text-warning' },
  Chargers: { icon: BatteryCharging, tone: 'bg-secondary-soft text-secondary' },
}

export function ProductThumb({ category, size = 'md', className, image }: { category: ProductCategory; size?: 'sm' | 'md' | 'xl'; className?: string; image?: string }) {
  const { icon: Icon, tone } = visuals[category]
  const box = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', xl: 'h-full w-full rounded-card' }[size]
  if (image) return <img src={image} alt="" className={cn('shrink-0 border border-border bg-surface object-cover', box, className)} />
  const glyph = { sm: 'h-4 w-4', md: 'h-5 w-5', xl: 'h-16 w-16' }[size]
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center', box, tone, className)}>
      <Icon className={glyph} strokeWidth={size === 'xl' ? 1.25 : 2} />
    </span>
  )
}

export function ProductCell({ product, subtitle }: { product: Pick<Product, 'name' | 'category' | 'sku' | 'image'>; subtitle?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductThumb category={product.category} image={product.image} />
      <div className="min-w-0">
        <p className="truncate font-semibold">{product.name}</p>
        <p className="truncate text-xs text-text-muted">{subtitle ?? product.sku}</p>
      </div>
    </div>
  )
}
