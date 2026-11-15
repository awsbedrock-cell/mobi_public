import { Check, ChevronDown, Plus, SlidersHorizontal, Store } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '../../branding/BrandProvider'
import { getPreset } from '../../branding/presets'
import { cn } from '../../lib/utils'
import { Dropdown, DropdownItem } from '../ui/Dropdown'
import { useToast } from '../ui/Toast'
import { BrandMark } from './Logo'

const heading = 'px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-subtle'
const trigger = 'inline-flex h-9 items-center gap-2 rounded-control border border-border bg-surface text-sm font-semibold transition-colors hover:border-primary'

/** Switches the active brand: its identity, theme and data. */
export function BrandSwitcher() {
  const { brands, brand, store, canManage, switchBrand, switchStore } = useBrand()
  const navigate = useNavigate()
  const notify = useToast()

  return (
    <Dropdown
      className="w-72"
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={`Brand: ${brand.name}`} className={cn(trigger, 'px-1.5 sm:pr-2.5')}>
          <BrandMark brand={brand} className="h-6 w-6 rounded-md text-[9px] shadow-none" />
          <span className="hidden max-w-[8rem] truncate xl:inline">{brand.name}</span>
          <ChevronDown className="h-4 w-4 text-text-subtle" />
        </button>
      )}
    >
      {(close) => (
        <>
          <p className={heading}>Brands</p>
          {brands.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                if (item.id !== brand.id) {
                  switchBrand(item.id)
                  notify(`Switched to ${item.name}`, 'info')
                }
                close()
              }}
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors', item.id === brand.id ? 'bg-primary-soft' : 'hover:bg-surface-muted')}
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold" style={item.logo ? undefined : { background: item.style.primary }}>
                {item.logo ? <img src={item.logo} alt="" className="h-8 w-8 rounded-lg object-contain" /> : <span className="h-3 w-3 rounded-full" style={{ background: item.style.accent }} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text">{item.name}</span>
                <span className="block truncate text-xs text-text-muted">{getPreset(item.presetId).industry}</span>
              </span>
              {item.id === brand.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          ))}

          <div className="sm:hidden">
            <p className={cn(heading, 'mt-1 border-t border-border pt-2.5')}>Store</p>
            {brand.stores.map((item) => (
              <DropdownItem
                key={item.id}
                active={item.id === store.id}
                icon={item.id === store.id ? <Check className="h-4 w-4" /> : <Store className="h-4 w-4 text-text-subtle" />}
                onClick={() => {
                  switchStore(item.id)
                  notify(`Switched to ${item.name}`, 'info')
                  close()
                }}
              >
                {item.name}
              </DropdownItem>
            ))}
          </div>

          <div className="mt-1 border-t border-border pt-1">
            <DropdownItem
              icon={<SlidersHorizontal className="h-4 w-4" />}
              onClick={() => {
                navigate('/settings/brands')
                close()
              }}
            >
              {canManage ? 'Manage brands' : 'View brands'}
            </DropdownItem>
            {canManage && (
              <DropdownItem
                icon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  navigate(`/settings/brands?new=${Date.now()}`)
                  close()
                }}
              >
                Add brand
              </DropdownItem>
            )}
          </div>
        </>
      )}
    </Dropdown>
  )
}

/** Switches the store/location within the active brand. */
export function StoreSwitcher() {
  const { brand, store, switchStore } = useBrand()
  const notify = useToast()

  return (
    <Dropdown
      className="w-64"
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={`Store: ${store.name}`} className={cn(trigger, 'hidden px-3 sm:inline-flex')}>
          <Store className="h-4 w-4 text-primary" />
          <span className="max-w-[9rem] truncate">{store.name}</span>
          <ChevronDown className="h-4 w-4 text-text-subtle" />
        </button>
      )}
    >
      {(close) => (
        <>
          <p className={heading}>{brand.name} stores</p>
          {brand.stores.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                if (item.id !== store.id) {
                  switchStore(item.id)
                  notify(`Switched to ${item.name}`, 'info')
                }
                close()
              }}
              className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors', item.id === store.id ? 'bg-primary-soft text-primary' : 'text-text hover:bg-surface-muted')}
            >
              {item.id === store.id ? <Check className="h-4 w-4 shrink-0" /> : <Store className="h-4 w-4 shrink-0 text-text-subtle" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{item.name}</span>
                <span className="block truncate text-xs text-text-muted">{item.type}</span>
              </span>
            </button>
          ))}
        </>
      )}
    </Dropdown>
  )
}
