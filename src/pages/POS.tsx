import { CheckCircle2, Minus, Plus, Printer, ScanLine, ShoppingCart, Trash2, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ProductCell, ProductThumb } from '../components/products/ProductThumb'
import { Button, IconButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { SearchInput, Select } from '../components/ui/Field'
import { PageHeader } from '../components/ui/Misc'
import { Modal } from '../components/ui/Modal'
import { Tabs } from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { useStore, type CompletedSale } from '../context/StoreContext'
import { categories } from '../data/mock'
import { cn, formatCurrency } from '../lib/utils'

const GST_RATE = 0.18
const payments = ['Cash', 'UPI', 'Card'] as const

export default function POS() {
  const { products, customers, cart, addToCart, setCartQty, clearCart, completeSale } = useStore()
  const notify = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [customerId, setCustomerId] = useState('')
  const [discount, setDiscount] = useState(0)
  const [payment, setPayment] = useState<(typeof payments)[number]>('UPI')
  const [receipt, setReceipt] = useState<CompletedSale | null>(null)
  const [cartOpen, setCartOpen] = useState(false)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return products.filter((product) => (category === 'All' || product.category === category) && (!term || [product.name, product.sku, product.barcode].some((field) => field.toLowerCase().includes(term))))
  }, [products, query, category])

  const lines = cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId)
    return product ? [{ product, qty: line.qty }] : []
  })
  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0)
  const gross = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0)
  const appliedDiscount = Math.min(discount, gross)
  const total = gross - appliedDiscount
  const tax = Math.round(total - total / (1 + GST_RATE))

  const add = (productId: string) => {
    const product = products.find((item) => item.id === productId)
    const inCart = cart.find((line) => line.productId === productId)?.qty ?? 0
    if (!product || product.stock <= inCart) {
      notify(product && product.stock > 0 ? `Only ${product.stock} in stock` : 'Out of stock', 'error')
      return
    }
    addToCart(productId)
  }

  const scan = () => {
    const match = products.find((product) => product.barcode === query.trim() || product.sku.toLowerCase() === query.trim().toLowerCase())
    if (match) {
      add(match.id)
      setQuery('')
    } else {
      notify('Type or scan a barcode / SKU in the search box first', 'info')
    }
  }

  const checkout = () => {
    if (lines.length === 0) return
    setReceipt(completeSale(customerId || null, total, payment))
    setDiscount(0)
    setCartOpen(false)
  }

  const cartPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4 sm:px-5">
        <h2 className="text-base font-bold">Current Bill</h2>
        {lines.length > 0 && (
          <button type="button" className="text-xs font-semibold text-error hover:underline" onClick={clearCart}>
            Clear all
          </button>
        )}
      </div>

      <div className="px-4 pt-3 sm:px-5">
        <label className="label" htmlFor="pos-customer">
          Customer
        </label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
          <Select id="pos-customer" className="pl-9" value={customerId} onChange={(event) => setCustomerId(event.target.value)} options={[{ value: '', label: 'Walk-in customer' }, ...customers.map((customer) => ({ value: customer.id, label: `${customer.name} · ${customer.phone}` }))]} />
        </div>
      </div>

      <div className="scroll-thin mt-3 min-h-[8rem] flex-1 overflow-y-auto px-4 sm:px-5">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center text-text-muted">
            <ShoppingCart className="h-8 w-8 text-text-subtle" />
            <p className="text-sm">Tap a product to start a bill.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {lines.map(({ product, qty }) => (
              <li key={product.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <ProductCell product={product} subtitle={`${formatCurrency(product.price)} each`} />
                  <IconButton label={`Remove ${product.name}`} tone="danger" className="-mr-2 -mt-1" onClick={() => setCartQty(product.id, 0)}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
                <div className="mt-2 flex items-center justify-between pl-[52px]">
                  <div className="inline-flex items-center rounded-control border border-border">
                    <button type="button" aria-label="Decrease quantity" className="inline-flex h-8 w-8 items-center justify-center text-text-muted hover:text-primary" onClick={() => setCartQty(product.id, qty - 1)}>
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{qty}</span>
                    <button type="button" aria-label="Increase quantity" className="inline-flex h-8 w-8 items-center justify-center text-text-muted hover:text-primary" onClick={() => add(product.id)}>
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="font-bold">{formatCurrency(product.price * qty)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-border p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="pos-discount" className="text-sm text-text-muted">
            Discount (₹)
          </label>
          <input id="pos-discount" type="number" min={0} className="field h-9 w-28 text-right" value={discount || ''} placeholder="0" onChange={(event) => setDiscount(Math.max(0, Number(event.target.value) || 0))} />
        </div>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-muted">Subtotal ({itemCount} items)</dt>
            <dd className="font-semibold">{formatCurrency(gross)}</dd>
          </div>
          {appliedDiscount > 0 && (
            <div className="flex justify-between">
              <dt className="text-text-muted">Discount</dt>
              <dd className="font-semibold text-success">−{formatCurrency(appliedDiscount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-text-muted">GST included (18%)</dt>
            <dd className="font-semibold">{formatCurrency(tax)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <dt className="font-bold">Total</dt>
            <dd className="text-2xl font-extrabold tracking-tight text-primary">{formatCurrency(total)}</dd>
          </div>
        </dl>
        <Tabs items={payments.map((value) => ({ value, label: value }))} value={payment} onChange={setPayment} className="[&>button]:flex-1 [&>button]:justify-center" />
        <Button block size="lg" disabled={lines.length === 0} onClick={checkout}>
          Complete Sale · {formatCurrency(total)}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <PageHeader title="Point of Sale (Billing)" subtitle="Search or scan products, then complete the sale." />

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-3">
          <div className="flex gap-2">
            <SearchInput className="flex-1" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && scan()} placeholder="Search barcode, IMEI or product…" aria-label="Search products" />
            <IconButton label="Add scanned barcode" bordered tone="primary" className="h-10 w-10" onClick={scan}>
              <ScanLine className="h-5 w-5" />
            </IconButton>
          </div>
          <Tabs items={['All', ...categories].map((value) => ({ value, label: value }))} value={category} onChange={setCategory} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => {
              const inCart = cart.find((line) => line.productId === product.id)?.qty ?? 0
              const soldOut = product.stock === 0
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={soldOut}
                  onClick={() => add(product.id)}
                  className={cn('relative flex flex-col rounded-card border bg-surface p-3 text-left shadow-card transition-colors disabled:opacity-50', inCart > 0 ? 'border-primary' : 'border-border hover:border-primary/60')}
                >
                  {inCart > 0 && <span className="absolute right-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-fg">{inCart}</span>}
                  <div className="mb-2 h-20 w-full sm:h-24">
                    <ProductThumb category={product.category} size="xl" className="[&>svg]:h-10 [&>svg]:w-10" />
                  </div>
                  <span className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight">{product.name}</span>
                  <span className="mt-1 flex items-center justify-between gap-1">
                    <span className="font-extrabold text-primary">{formatCurrency(product.price)}</span>
                    <span className={cn('text-[11px] font-semibold', soldOut ? 'text-error' : 'text-text-subtle')}>{soldOut ? 'Sold out' : `${product.stock} left`}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {filtered.length === 0 && <Card className="p-10 text-center text-sm text-text-muted">No products match “{query}”.</Card>}
        </div>

        <Card className="sticky top-20 hidden max-h-[calc(100dvh-6.5rem)] self-start lg:block">{cartPanel}</Card>
      </div>

      {/* Phone and tablet: sticky bill bar that opens the cart as a sheet. */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-surface/95 p-3 backdrop-blur md:bottom-0 lg:hidden">
        <Button block size="lg" onClick={() => setCartOpen(true)} icon={<ShoppingCart className="h-5 w-5" />}>
          {itemCount > 0 ? `View Bill · ${itemCount} item${itemCount > 1 ? 's' : ''} · ${formatCurrency(total)}` : 'View Bill'}
        </Button>
      </div>
      <div className="h-20 lg:hidden" />

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden">
          <div className="absolute inset-0 bg-overlay/50" onClick={() => setCartOpen(false)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Current bill" className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-border bg-surface-raised shadow-pop">
            <button type="button" aria-label="Close bill" className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-border-strong" onClick={() => setCartOpen(false)} />
            <div className="min-h-0 flex-1 overflow-y-auto">{cartPanel}</div>
          </div>
        </div>
      )}

      <Modal
        open={receipt !== null}
        onClose={() => setReceipt(null)}
        title="Sale Complete"
        size="md"
        footer={
          <>
            <Button variant="outline" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
              Print Receipt
            </Button>
            <Button onClick={() => setReceipt(null)}>New Sale</Button>
          </>
        }
      >
        {receipt && (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CheckCircle2 className="h-14 w-14 text-success" />
            <p className="text-3xl font-extrabold tracking-tight">{formatCurrency(receipt.total)}</p>
            <p className="text-sm text-text-muted">
              Invoice {receipt.id} · {receipt.items} item{receipt.items > 1 ? 's' : ''} · paid by {payment}
            </p>
            <p className="text-xs text-text-subtle">Stock and today's sales have been updated.</p>
          </div>
        )}
      </Modal>
    </>
  )
}
