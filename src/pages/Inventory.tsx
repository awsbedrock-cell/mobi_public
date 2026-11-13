import { Boxes, IndianRupee, PackageX, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ProductCell } from '../components/products/ProductThumb'
import { StockBadge } from '../components/products/StockBadge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DataTable, type Column } from '../components/ui/DataTable'
import { FormField, SearchInput, Select } from '../components/ui/Field'
import { PageHeader, StatCard, Toolbar } from '../components/ui/Misc'
import { Modal } from '../components/ui/Modal'
import { Tabs } from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { stockStatus, useStore } from '../context/StoreContext'
import type { Product } from '../data/types'
import { formatCurrency, formatNumber } from '../lib/utils'

const filters = ['All', 'In Stock', 'Low Stock', 'Out of Stock'] as const
const reasons = ['New stock received', 'Customer return', 'Damaged / defective', 'Stock count correction']

export default function Inventory() {
  const { products, adjustStock } = useStore()
  const notify = useToast()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')
  const [target, setTarget] = useState<Product | null>(null)
  const [direction, setDirection] = useState<'add' | 'remove'>('add')
  const [qty, setQty] = useState(1)
  const [reason, setReason] = useState(reasons[0])

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase()
    return products.filter((product) => (filter === 'All' || stockStatus(product) === filter) && (!term || [product.name, product.sku].some((field) => field.toLowerCase().includes(term))))
  }, [products, query, filter])

  const units = products.reduce((sum, product) => sum + product.stock, 0)
  const value = products.reduce((sum, product) => sum + product.stock * product.cost, 0)
  const low = products.filter((product) => stockStatus(product) === 'Low Stock').length
  const out = products.filter((product) => stockStatus(product) === 'Out of Stock').length

  const openAdjust = (product: Product) => {
    setTarget(product)
    setDirection('add')
    setQty(1)
    setReason(reasons[0])
  }

  const apply = () => {
    if (!target || qty <= 0) return
    const delta = direction === 'add' ? qty : -Math.min(qty, target.stock)
    adjustStock(target.id, delta)
    notify(`${target.name}: stock ${delta >= 0 ? 'increased' : 'reduced'} by ${Math.abs(delta)}`)
    setTarget(null)
  }

  const columns: Column<Product>[] = [
    { key: 'product', header: 'Product', mobile: 'title', render: (product) => <ProductCell product={product} /> },
    { key: 'sku', header: 'SKU', mobile: 'hidden', render: (product) => <span className="whitespace-nowrap text-text-muted">{product.sku}</span> },
    { key: 'stock', header: 'Stock', align: 'right', render: (product) => <span className="font-bold">{product.stock}</span> },
    { key: 'reserved', header: 'Reserved', align: 'right', render: (product) => product.reserved },
    { key: 'available', header: 'Available', align: 'right', render: (product) => Math.max(0, product.stock - product.reserved) },
    { key: 'status', header: 'Status', render: (product) => <StockBadge product={product} /> },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      mobile: 'aside',
      render: (product) => (
        <Button size="sm" variant="secondary" icon={<SlidersHorizontal className="h-3.5 w-3.5" />} onClick={() => openAdjust(product)}>
          Adjust
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Inventory — Stock Management" subtitle="Track stock levels and adjust quantities." />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total Units" value={formatNumber(units)} icon={<Boxes className="h-5 w-5" />} />
        <StatCard label="Stock Value" value={formatCurrency(value)} icon={<IndianRupee className="h-5 w-5" />} tone="success" />
        <StatCard label="Low Stock" value={low} icon={<TriangleAlert className="h-5 w-5" />} tone="warning" />
        <StatCard label="Out of Stock" value={out} icon={<PackageX className="h-5 w-5" />} tone="error" />
      </div>

      <Card>
        <Toolbar className="sm:justify-between">
          <SearchInput className="sm:w-72" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product or SKU…" aria-label="Search inventory" />
          <Tabs items={filters.map((value) => ({ value, label: value }))} value={filter} onChange={setFilter} />
        </Toolbar>
        <DataTable columns={columns} rows={rows} rowKey={(product) => product.id} empty="No products match your filters." />
      </Card>

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title="Adjust Stock"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button onClick={apply}>Update Stock</Button>
          </>
        }
      >
        {target && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-card bg-surface-muted p-3">
              <ProductCell product={target} />
              <span className="text-sm text-text-muted">
                Current <span className="font-bold text-text">{target.stock}</span>
              </span>
            </div>
            <Tabs
              items={[
                { value: 'add', label: 'Add stock' },
                { value: 'remove', label: 'Remove stock' },
              ]}
              value={direction}
              onChange={setDirection}
              className="[&>button]:flex-1 [&>button]:justify-center"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Quantity" required>
                <input className="field" type="number" min={1} value={qty} onChange={(event) => setQty(Math.max(0, Number(event.target.value) || 0))} />
              </FormField>
              <FormField label="Reason">
                <Select options={reasons} value={reason} onChange={(event) => setReason(event.target.value)} />
              </FormField>
            </div>
            <p className="text-sm text-text-muted">
              New stock level: <span className="font-bold text-text">{direction === 'add' ? target.stock + qty : Math.max(0, target.stock - qty)}</span>
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}
