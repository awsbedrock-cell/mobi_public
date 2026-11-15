import { brandInitials, useBrand } from '../../branding/BrandProvider'
import type { Brand } from '../../branding/types'
import { cn } from '../../lib/utils'

/** Square brand mark: the uploaded logo, the built-in Mobi mark, or a monogram. */
export function BrandMark({ brand, className }: { brand: Pick<Brand, 'id' | 'name' | 'logo'>; className?: string }) {
  if (brand.logo) return <img src={brand.logo} alt="" className={cn('h-9 w-9 shrink-0 rounded-xl border border-border bg-surface object-contain', className)} />
  return (
    <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-extrabold text-primary-fg shadow-brand', className)}>
      {brand.id === 'mobi' ? (
        <svg viewBox="0 0 32 32" className="h-2/3 w-2/3" aria-hidden>
          <path d="M7 22V11.5l4.6 6.2 4.4-6.2 4.4 6.2 4.6-6.2V22" fill="none" className="stroke-primary-fg" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        brandInitials(brand.name)
      )}
    </span>
  )
}

export function Logo({ className }: { className?: string }) {
  const { brand } = useBrand()
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
      <BrandMark brand={brand} />
      <span className="min-w-0 leading-none">
        <span className="block truncate font-heading text-lg font-extrabold tracking-tight text-text">{brand.id === 'mobi' ? brand.name.toUpperCase() : brand.name}</span>
        <span className="block truncate text-[10px] font-semibold text-text-muted">{brand.tagline}</span>
      </span>
    </span>
  )
}
