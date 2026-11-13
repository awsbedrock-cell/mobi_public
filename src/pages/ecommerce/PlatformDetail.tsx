import { ExternalLink, HeartPulse, IndianRupee, ListChecks, RefreshCcw, Settings, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Tabs } from '../../components/ui/Tabs'
import { ProductListings } from './PlatformProducts'
import { OrderList } from './PlatformOrders'
import { SyncLogList } from './SyncLogs'
import { Link, useParams } from 'react-router-dom'
import { DonutChart, LineChart } from '../../components/charts/Charts'
import { OrderDetailsModal } from '../../components/ecommerce/OrderDetailsModal'
import { PlatformLogo } from '../../components/ecommerce/PlatformLogo'
import { PlatformSettingsModal } from '../../components/ecommerce/PlatformSettingsModal'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { PageHeader, StatCard } from '../../components/ui/Misc'
import { useToast } from '../../components/ui/Toast'
import { useStore } from '../../context/StoreContext'
import { platformTrend } from '../../data/mock'
import type { PlatformOrder } from '../../data/types'
import { formatCurrency, formatDate, formatNumber } from '../../lib/utils'
import { orderColumns } from './PlatformOrders'

export default function PlatformDetail() {
  const { id } = useParams()
  const { platforms, orders, syncPlatform } = useStore()
  const notify = useToast()
  const platform = platforms.find((item) => item.id === id)
  const [settings, setSettings] = useState(false)
  const [tab, setTab] = useState<'overview' | 'products' | 'orders' | 'logs'>('overview')
  const [open, setOpen] = useState<PlatformOrder | null>(null)

  if (!platform) {
    return (
      <Card className="p-10 text-center">
        <p className="font-bold">Platform not found</p>
        <Link to="/ecommerce" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
          Back to platforms
        </Link>
      </Card>
    )
  }

  const scale = platform.sales / 465300
  const listed = Math.round(platform.listed * (platform.health / 100))
  const failed = Math.round((platform.listed - listed) * 0.4)
  const pending = platform.listed - listed - failed
  const platformOrders = orders.filter((order) => order.platform === platform.id)

  return (
    <>
      <PageHeader title={platform.name} crumbs={[{ label: 'E-commerce Platforms', to: '/ecommerce' }, { label: platform.name }]} />

      <Card className="mb-4 flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <PlatformLogo id={platform.id} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold">{platform.name}</h2>
              <Badge tone={platform.connected ? 'success' : 'neutral'}>{platform.connected ? 'Connected' : 'Disconnected'}</Badge>
            </div>
            <p className="text-xs text-text-muted">Last sync: {formatDate(platform.lastSync, true)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            variant="secondary"
            icon={<RefreshCcw className="h-4 w-4" />}
            onClick={() => {
              syncPlatform(platform.id)
              notify(`${platform.name} synced`)
            }}
          >
            Sync Now
          </Button>
          <Button variant="outline" icon={<ExternalLink className="h-4 w-4" />} onClick={() => window.open(platform.portalUrl, '_blank', 'noopener')}>
            View on {platform.name}
          </Button>
          <Button variant="outline" icon={<Settings className="h-4 w-4" />} onClick={() => setSettings(true)}>
            Platform Settings
          </Button>
        </div>
      </Card>

      <Tabs
        className="mb-3"
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'products', label: 'Products' },
          { value: 'orders', label: 'Orders' },
          { value: 'logs', label: 'Sync Logs' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'products' && <ProductListings lockedPlatform={platform.id} />}
      {tab === 'orders' && <OrderList lockedPlatform={platform.id} />}
      {tab === 'logs' && <SyncLogList lockedPlatform={platform.id} />}
      {tab === 'overview' && (
        <>
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Listed Products" value={formatNumber(platform.listed)} icon={<ListChecks className="h-5 w-5" />} />
        <StatCard label={`Orders (${platform.name})`} value={formatNumber(platform.orders)} icon={<ShoppingBag className="h-5 w-5" />} tone="info" delta={12} hint="" />
        <StatCard label="Sales (30 Days)" value={formatCurrency(platform.sales)} icon={<IndianRupee className="h-5 w-5" />} tone="warning" />
        <StatCard label="Listing Health" value={`${platform.health}%`} icon={<HeartPulse className="h-5 w-5" />} tone="success" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title={`Sales Trend (${platform.name})`} subtitle="Last 7 days" />
          <div className="p-4 sm:p-5">
            <LineChart data={platformTrend.map((point) => ({ ...point, value: Math.round(point.value * scale) }))} format={(value) => `₹${value >= 1000 ? `${(value / 1000).toFixed(1)}K` : Math.round(value)}`} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Listing Status" />
          <div className="p-4 sm:p-5">
            <DonutChart
              centerValue={formatNumber(platform.listed)}
              centerLabel="Products"
              segments={[
                { label: 'Listed', value: listed, stroke: 'stroke-success', dot: 'bg-success' },
                { label: 'Pending', value: pending, stroke: 'stroke-warning', dot: 'bg-warning' },
                { label: 'Failed', value: failed, stroke: 'stroke-error', dot: 'bg-error' },
              ]}
            />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Recent Orders" subtitle={`Latest orders from ${platform.name}`} className="pb-3" />
        <DataTable columns={orderColumns} rows={platformOrders} rowKey={(order) => order.id} onRowClick={setOpen} empty={`No recent orders from ${platform.name}.`} />
      </Card>
        </>
      )}

      {settings && <PlatformSettingsModal platformId={platform.id} onClose={() => setSettings(false)} />}
      {open && <OrderDetailsModal order={open} onClose={() => setOpen(null)} />}
    </>
  )
}
