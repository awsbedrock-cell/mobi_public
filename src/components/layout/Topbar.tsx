import { initials } from '../../lib/utils'
import { Bell, Check, ChevronDown, Menu, PackageX, Search, Settings, ShoppingBag, Store, TriangleAlert, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { stockStatus, useStore } from '../../context/StoreContext'
import { IconButton } from '../ui/Button'
import { Dropdown, DropdownItem } from '../ui/Dropdown'
import { useToast } from '../ui/Toast'
import { Logo } from './Logo'
import { ThemeSwitcher } from './ThemeSwitcher'

const stores = [import.meta.env.VITE_STORE_NAME || 'Main Store', 'City Mall Outlet', 'Online Warehouse']
const user = { name: 'Nishu Singh', role: 'Store Owner' }

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate()
  const notify = useToast()
  const { products, syncLogs } = useStore()
  const [store, setStore] = useState(stores[0])
  const [query, setQuery] = useState('')
  const [read, setRead] = useState(false)

  const lowStock = products.filter((product) => stockStatus(product) !== 'In Stock').slice(0, 3)
  const failed = syncLogs.filter((log) => log.status === 'Failed').slice(0, 2)
  const count = lowStock.length + failed.length

  const onSearch = (event: FormEvent) => {
    event.preventDefault()
    navigate(`/products?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface/90 px-3 backdrop-blur sm:gap-3 sm:px-5 lg:px-6">
      <IconButton label="Open menu" onClick={onMenu} className="lg:hidden">
        <Menu className="h-5 w-5" />
      </IconButton>
      <Logo className="lg:hidden [&>span:last-child]:max-[380px]:hidden" />

      <form onSubmit={onSearch} role="search" className="relative ml-2 hidden max-w-md flex-1 md:block lg:ml-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="field pl-9" placeholder="Search product, customer, invoice…" aria-label="Global search" />
      </form>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Dropdown
          trigger={({ toggle, open }) => (
            <button type="button" onClick={toggle} aria-expanded={open} className="hidden h-9 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-semibold transition-colors hover:border-primary sm:inline-flex">
              <Store className="h-4 w-4 text-primary" />
              <span className="max-w-[9rem] truncate">{store}</span>
              <ChevronDown className="h-4 w-4 text-text-subtle" />
            </button>
          )}
        >
          {(close) =>
            stores.map((name) => (
              <DropdownItem
                key={name}
                active={name === store}
                icon={name === store ? <Check className="h-4 w-4" /> : <Store className="h-4 w-4 text-text-subtle" />}
                onClick={() => {
                  setStore(name)
                  notify(`Switched to ${name}`, 'info')
                  close()
                }}
              >
                {name}
              </DropdownItem>
            ))
          }
        </Dropdown>

        <ThemeSwitcher />

        <Dropdown
          className="w-80"
          trigger={({ toggle, open }) => (
            <IconButton label="Notifications" bordered onClick={toggle} aria-expanded={open} className="relative">
              <Bell className="h-[18px] w-[18px]" />
              {!read && count > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error ring-2 ring-surface" />}
            </IconButton>
          )}
        >
          {(close) => (
            <div>
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-sm font-bold">Notifications</p>
                <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setRead(true)}>
                  Mark all read
                </button>
              </div>
              {lowStock.map((product) => (
                <DropdownItem
                  key={product.id}
                  icon={product.stock === 0 ? <PackageX className="h-4 w-4 text-error" /> : <TriangleAlert className="h-4 w-4 text-warning" />}
                  onClick={() => {
                    navigate('/inventory')
                    close()
                  }}
                >
                  {product.name} — {product.stock === 0 ? 'out of stock' : `${product.stock} left`}
                </DropdownItem>
              ))}
              {failed.map((log) => (
                <DropdownItem
                  key={log.id}
                  icon={<ShoppingBag className="h-4 w-4 text-error" />}
                  onClick={() => {
                    navigate('/ecommerce/sync-logs')
                    close()
                  }}
                >
                  Sync failed for {log.sku}
                </DropdownItem>
              ))}
              {count === 0 && <p className="px-3 py-4 text-center text-sm text-text-muted">You're all caught up.</p>}
            </div>
          )}
        </Dropdown>

        <Dropdown
          trigger={({ toggle, open }) => (
            <button type="button" onClick={toggle} aria-expanded={open} aria-label="Account menu" className="rounded-full">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-fg">{initials(user.name)}</span>
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="px-3 py-2">
                <p className="text-sm font-bold">{user.name}</p>
                <p className="text-xs text-text-muted">{user.role}</p>
              </div>
              <DropdownItem
                icon={<User className="h-4 w-4" />}
                onClick={() => {
                  navigate('/settings')
                  close()
                }}
              >
                Profile
              </DropdownItem>
              <DropdownItem
                icon={<Settings className="h-4 w-4" />}
                onClick={() => {
                  navigate('/settings')
                  close()
                }}
              >
                Settings
              </DropdownItem>
            </>
          )}
        </Dropdown>
      </div>
    </header>
  )
}
