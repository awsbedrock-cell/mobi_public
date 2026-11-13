import { useMemo, useState } from 'react'
import { OrderDetailsModal, orderTones } from '../../components/ecommerce/OrderDetailsModal'
import { PlatformName } from '../../components/ecommerce/PlatformLogo'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { SearchInput, Select } from '../../components/ui/Field'
import { PageHeader, Toolbar } from '../../components/ui/Misc'
import { Pagination } from '../../components/ui/Pagination'
import { useStore } from '../../context/StoreContext'
import type { PlatformId, PlatformOrder } from '../../data/types'
import { dateRanges, formatCurrency, formatDate, inDateRange, type DateRange } from '../../lib/utils'

const PAGE_SIZE = 6
const statuses = ['All Status', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

export const orderColumns: Column<PlatformOrder>[] = [
  { key: 'id', header: 'Order ID', mobile: 'title', render: (order) => <span className="font-semibold text-primary">#{order.id}</span> },
  { key: 'platform', header: 'Platform', render: (order) => <PlatformName id={order.platform} /> },
  { key: 'customer', header: 'Customer', render: (order) => order.customer },
  { key: 'items', header: 'Items', align: 'right', mobile: 'hidden', render: (order) => order.lines.reduce((sum, line) => sum + line.qty, 0) },
  { key: 'amount', header: 'Amount', align: 'right', render: (order) => <span className="font-bold">{formatCurrency(order.amount)}</span> },
  { key: 'date', header: 'Order Date', render: (order) => formatDate(order.date) },
  { key: 'status', header: 'Status', mobile: 'aside', render: (order) => <Badge tone={orderTones[order.status]}>{order.status}</Badge> },
]

export function OrderList({ lockedPlatform }: { lockedPlatform?: PlatformId }) {
  const { orders, platforms } = useStore()
  const [query, setQuery] = useState('')
  const [platformFilter, setPlatform] = useState('all')
  const platform = lockedPlatform ?? platformFilter
  const [range, setRange] = useState<DateRange>('All Time')
  const [status, setStatus] = useState(statuses[0])
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<PlatformOrder | null>(null)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return orders.filter(
      (order) =>
        (platform === 'all' || order.platform === platform) &&
        (status === statuses[0] || order.status === status) &&
        inDateRange(order.date, range) &&
        (!term || [order.id, order.customer, ...order.lines.map((line) => line.name)].some((field) => field.toLowerCase().includes(term))),
    )
  }, [orders, query, platform, status, range])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)

  return (
    <>
      {!lockedPlatform && <PageHeader title="Orders" crumbs={[{ label: 'E-commerce Platforms', to: '/ecommerce' }, { label: 'Orders' }]} />}
      <Card>
        <Toolbar>
          <SearchInput className="flex-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by order ID, customer or product…" aria-label="Search orders" />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {!lockedPlatform && <Select aria-label="Filter by platform" className="sm:w-40" value={platform} onChange={(event) => setPlatform(event.target.value)} options={[{ value: 'all', label: 'All Platforms' }, ...platforms.map((item) => ({ value: item.id, label: item.name }))]} />}
            <Select aria-label="Filter by status" className="sm:w-36" value={status} onChange={(event) => setStatus(event.target.value)} options={statuses} />
            <Select aria-label="Filter by date" className="sm:w-36" value={range} onChange={(event) => setRange(event.target.value as DateRange)} options={[...dateRanges]} />
          </div>
        </Toolbar>
        <DataTable columns={orderColumns} rows={filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)} rowKey={(order) => order.id} onRowClick={setOpen} empty="No orders match your filters." />
        <div className="border-t border-border">
          <Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} noun="orders" />
        </div>
      </Card>
      {open && <OrderDetailsModal order={open} onClose={() => setOpen(null)} />}
    </>
  )
}

export default function PlatformOrders() {
  return <OrderList />
}
