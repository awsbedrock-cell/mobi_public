import { ChevronRight, IndianRupee, ListChecks, Package, Plus, Settings, ShoppingBag, Store } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlatformLogo } from '../../components/ecommerce/PlatformLogo'
import { PlatformSettingsModal } from '../../components/ecommerce/PlatformSettingsModal'
import { Badge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Toggle } from '../../components/ui/Field'
import { PageHeader, StatCard } from '../../components/ui/Misc'
import { useToast } from '../../components/ui/Toast'
import { useStore } from '../../context/StoreContext'
import type { PlatformId } from '../../data/types'
import { formatCurrency, formatNumber } from '../../lib/utils'

export default function Overview() {
  const { platforms, togglePlatform } = useStore()
  const notify = useToast()
  const [settingsFor, setSettingsFor] = useState<PlatformId | null>(null)
  const connected = platforms.filter((platform) => platform.connected)
  const sum = (key: 'listed' | 'orders' | 'sales') => connected.reduce((total, platform) => total + platform[key], 0)

  return (
    <>
      <PageHeader title="E-commerce Platforms" subtitle="Manage all your products across multiple marketplaces." />

      <Card className="relative mb-4 overflow-hidden border-primary/20 bg-primary-soft p-5 sm:p-7">
        <div className="relative z-10 max-w-md">
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            List Once,
            <br />
            <span className="text-primary">Sell Everywhere</span>
          </h2>
          <p className="mt-2 text-sm text-text-muted">Scan or add your product and it will automatically list on Amazon, Flipkart, Myntra, Nykaa, Meesho, Blinkit and more.</p>
          <Link to="/products/add" className="mt-4 inline-block">
            <Button icon={<Plus className="h-4 w-4" />}>Add or Scan Product</Button>
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 md:absolute md:right-8 md:top-1/2 md:mt-0 md:w-52 md:-translate-y-1/2 md:justify-center lg:w-64">
          {platforms.map((platform) => (
            <PlatformLogo key={platform.id} id={platform.id} size="lg" className="shadow-card" />
          ))}
          <Store className="pointer-events-none absolute -right-6 -top-10 hidden h-44 w-44 text-primary/10 md:block" strokeWidth={1} />
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total Products" value={formatNumber(2430)} icon={<Package className="h-5 w-5" />} />
        <StatCard label="Listed Products" value={formatNumber(sum('listed'))} icon={<ListChecks className="h-5 w-5" />} tone="success" delta={98} hint="listed" />
        <StatCard label="Orders (All Platforms)" value={formatNumber(sum('orders'))} icon={<ShoppingBag className="h-5 w-5" />} tone="info" />
        <StatCard label="Sales (30 Days)" value={formatCurrency(sum('sales'))} icon={<IndianRupee className="h-5 w-5" />} tone="warning" />
      </div>

      <h2 className="mb-3 text-base font-bold">
        Connected Platforms ({connected.length}/{platforms.length})
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {platforms.map((platform) => (
          <Card key={platform.id} className="p-4">
            <div className="flex items-center gap-3">
              <PlatformLogo id={platform.id} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{platform.name}</p>
                <Badge tone={platform.connected ? 'success' : 'neutral'} className="mt-0.5 !px-2 !py-0.5">
                  {platform.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              <Toggle
                label={`${platform.connected ? 'Disconnect' : 'Connect'} ${platform.name}`}
                checked={platform.connected}
                onChange={() => {
                  togglePlatform(platform.id)
                  notify(`${platform.name} ${platform.connected ? 'disconnected' : 'connected'}`, platform.connected ? 'info' : 'success')
                }}
              />
              <IconButton label={`${platform.name} settings`} onClick={() => setSettingsFor(platform.id)}>
                <Settings className="h-4 w-4" />
              </IconButton>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                ['Listed', formatNumber(platform.listed)],
                ['Orders', formatNumber(platform.orders)],
                ['Sales', `₹${(platform.sales / 100000).toFixed(1)}L`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-surface-muted py-2">
                  <dt className="text-[11px] font-medium text-text-muted">{label}</dt>
                  <dd className="text-sm font-extrabold">{value}</dd>
                </div>
              ))}
            </dl>
            <Link to={`/ecommerce/platform/${platform.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              View {platform.name} dashboard <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        ))}
      </div>

      {settingsFor && <PlatformSettingsModal platformId={settingsFor} onClose={() => setSettingsFor(null)} />}
    </>
  )
}
