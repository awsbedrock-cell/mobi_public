import { ExternalLink } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import type { OrderStatus, PlatformOrder } from '../../data/types'
import { formatCurrency, formatDate } from '../../lib/utils'
import { ProductThumb } from '../products/ProductThumb'
import { Badge, type Tone } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { PlatformLogo } from './PlatformLogo'

export const orderTones: Record<OrderStatus, Tone> = { Shipped: 'success', Processing: 'warning', Delivered: 'info', Cancelled: 'error' }

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm sm:justify-start">
      <dt className="shrink-0 text-text-muted sm:w-24">{label}</dt>
      <dd className="min-w-0 break-words text-right font-semibold sm:text-left">{value}</dd>
    </div>
  )
}

export function OrderDetailsModal({ order, onClose }: { order: PlatformOrder; onClose: () => void }) {
  const { platforms, products } = useStore()
  const platform = platforms.find((item) => item.id === order.platform)
  const units = order.lines.reduce((sum, line) => sum + line.qty, 0)
  const isDate = /^\d{4}-/.test(order.delivery)

  return (
    <Modal open onClose={onClose} title="Order Details" size="lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <PlatformLogo id={order.platform} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-extrabold">{platform?.name}</p>
              <Badge tone={orderTones[order.status]}>{order.status}</Badge>
            </div>
            <p className="text-sm text-text-muted">
              Order ID: <span className="font-semibold text-text">#{order.id}</span>
            </p>
          </div>
        </div>
        <Button variant="outline" icon={<ExternalLink className="h-4 w-4" />} onClick={() => window.open(platform?.portalUrl, '_blank', 'noopener')}>
          View on {platform?.name}
        </Button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <section className="rounded-card border border-border p-4">
          <h3 className="mb-3 text-sm font-bold">Order Information</h3>
          <dl className="space-y-2">
            <Field label="Order Date" value={formatDate(order.date, true)} />
            <Field label="Customer" value={order.customer} />
            <Field label="Amount" value={formatCurrency(order.amount)} />
            <Field label="Items" value={String(units)} />
          </dl>
        </section>
        <section className="rounded-card border border-border p-4">
          <h3 className="mb-3 text-sm font-bold">Shipping Details</h3>
          <dl className="space-y-2">
            <Field label="Address" value={order.address} />
            <Field label="Tracking ID" value={order.trackingId} />
            <Field label="Courier" value={order.courier} />
            <Field label="Delivery" value={isDate ? `${formatDate(order.delivery)}${order.status === 'Delivered' ? '' : ' (Expected)'}` : order.delivery} />
          </dl>
        </section>
      </div>

      <section className="mt-5">
        <h3 className="mb-2 text-sm font-bold">Order Items</h3>
        <ul className="divide-y divide-border rounded-card border border-border">
          {order.lines.map((line) => {
            const product = products.find((item) => item.id === line.productId)
            return (
              <li key={line.sku} className="flex items-center gap-3 p-3">
                <ProductThumb category={product?.category ?? 'Accessories'} image={product?.image} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{line.name}</p>
                  <p className="text-xs text-text-muted">
                    {line.sku} · Qty {line.qty} × {formatCurrency(line.price)}
                  </p>
                </div>
                <span className="font-bold">{formatCurrency(line.qty * line.price)}</span>
              </li>
            )
          })}
          <li className="flex items-center justify-between bg-surface-muted p-3 text-sm">
            <span className="font-semibold text-text-muted">Total</span>
            <span className="text-base font-extrabold">{formatCurrency(order.amount)}</span>
          </li>
        </ul>
      </section>
    </Modal>
  )
}
