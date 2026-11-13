import { ImagePlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useStore } from '../../context/StoreContext'
import { brands, categories } from '../../data/mock'
import type { PlatformId, Product, ProductCategory } from '../../data/types'
import { formatCurrency } from '../../lib/utils'
import { PlatformLogo } from '../ecommerce/PlatformLogo'
import { Button } from '../ui/Button'
import { Checkbox, FormField, Select } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { Tabs } from '../ui/Tabs'
import { useToast } from '../ui/Toast'
import { ProductThumb } from './ProductThumb'

type Tab = 'details' | 'listing' | 'pricing'

const tabs: Array<{ value: Tab; label: string }> = [
  { value: 'details', label: 'Product Details' },
  { value: 'listing', label: 'Listing (Platforms)' },
  { value: 'pricing', label: 'Inventory & Pricing' },
]

export function emptyProduct(overrides: Partial<Product> = {}): Product {
  return { id: '', name: '', sku: '', barcode: '', category: 'Accessories', brand: 'MOBI', price: 0, cost: 0, stock: 0, reserved: 0, reorderLevel: 5, description: '', platforms: [], ...overrides }
}

interface Props {
  /** Product to edit, or a draft with an empty id to create. */
  product: Product
  onClose: () => void
  initialTab?: Tab
}

export function ProductFormModal({ product, onClose, initialTab = 'details' }: Props) {
  const { platforms, products, saveProduct } = useStore()
  const notify = useToast()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [draft, setDraft] = useState(product)
  const [error, setError] = useState('')
  const isNew = product.id === ''

  const set = <K extends keyof Product>(key: K, value: Product[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const number = (value: string) => Math.max(0, Number(value) || 0)

  const togglePlatform = (id: PlatformId, checked: boolean) => set('platforms', checked ? [...draft.platforms, id] : draft.platforms.filter((item) => item !== id))

  const onImage = (file: File | undefined) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Choose an image smaller than 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => set('image', String(reader.result))
    reader.readAsDataURL(file)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const name = draft.name.trim()
    const sku = draft.sku.trim().toUpperCase()
    if (!name || !sku) {
      setTab('details')
      setError('Product name and SKU are required.')
      return
    }
    if (products.some((item) => item.sku === sku && item.id !== draft.id)) {
      setTab('details')
      setError(`SKU ${sku} is already used by another product.`)
      return
    }
    if (draft.price <= 0) {
      setTab('pricing')
      setError('Enter a selling price greater than zero.')
      return
    }
    saveProduct({ ...draft, name, sku, id: isNew ? `p${Date.now()}` : draft.id })
    const listed = draft.platforms.length
    notify(isNew ? `${name} added${listed ? ` and listed on ${listed} platform${listed > 1 ? 's' : ''}` : ''}` : `${name} updated`)
    onClose()
  }

  const margin = draft.price > 0 ? Math.round(((draft.price - draft.cost) / draft.price) * 100) : 0

  return (
    <Modal
      open
      onClose={onClose}
      title="Add / Edit Product"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="product-form">
            {draft.platforms.length > 0 ? 'Save & List' : 'Save Product'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={onSubmit} noValidate>
        <Tabs items={tabs} value={tab} onChange={setTab} className="mb-4" />
        {error && (
          <p role="alert" className="mb-4 rounded-control bg-error-soft px-3 py-2 text-sm font-medium text-error">
            {error}
          </p>
        )}

        {tab === 'details' && (
          <div className="grid gap-5 md:grid-cols-[13rem_1fr]">
            <div className="flex gap-3 md:flex-col">
              <div className="h-32 w-32 shrink-0 md:h-52 md:w-full">
                <ProductThumb category={draft.category} image={draft.image} size="xl" />
              </div>
              <div className="flex flex-1 flex-col gap-2 md:flex-none">
                <label className="flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-card border border-dashed border-primary/50 bg-primary-soft/50 text-xs font-semibold text-primary transition-colors focus-within:ring-2 focus-within:ring-primary hover:bg-primary-soft">
                  <ImagePlus className="h-5 w-5" />
                  {draft.image ? 'Change Image' : 'Add Images'}
                  <input type="file" accept="image/*" className="sr-only" onChange={(event) => onImage(event.target.files?.[0])} />
                </label>
                {draft.image && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => set('image', undefined)}>
                    Remove image
                  </Button>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Product Name" required>
                <input className="field" value={draft.name} onChange={(event) => set('name', event.target.value)} placeholder="e.g. Wireless Headphones" autoFocus />
              </FormField>
              <FormField label="SKU" required>
                <input className="field" value={draft.sku} onChange={(event) => set('sku', event.target.value)} placeholder="e.g. WH-1001" />
              </FormField>
              <FormField label="Category" required>
                <Select options={[...categories]} value={draft.category} onChange={(event) => set('category', event.target.value as ProductCategory)} />
              </FormField>
              <FormField label="Brand">
                <Select options={brands} value={draft.brand} onChange={(event) => set('brand', event.target.value)} />
              </FormField>
              <FormField label="Barcode / IMEI" className="sm:col-span-2">
                <input className="field" value={draft.barcode} onChange={(event) => set('barcode', event.target.value)} placeholder="Scan or type the barcode" inputMode="numeric" />
              </FormField>
              <FormField label="Description" className="sm:col-span-2">
                <textarea className="field" rows={3} value={draft.description} onChange={(event) => set('description', event.target.value)} placeholder="Short description shown on listings" />
              </FormField>
            </div>
          </div>
        )}

        {tab === 'listing' && (
          <div>
            <p className="mb-3 text-sm text-text-muted">Choose where this product is listed. Price and stock stay in sync automatically.</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {platforms.map((platform) => {
                const checked = draft.platforms.includes(platform.id)
                return (
                  <li key={platform.id}>
                    <label className={`flex cursor-pointer items-center gap-3 rounded-card border p-3 transition-colors ${checked ? 'border-primary bg-primary-soft/60' : 'border-border hover:border-border-strong'} ${platform.connected ? '' : 'opacity-60'}`}>
                      <PlatformLogo id={platform.id} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{platform.name}</span>
                        <span className="block truncate text-xs text-text-muted">{platform.connected ? platform.marketplace : 'Not connected'}</span>
                      </span>
                      <Checkbox label={`List on ${platform.name}`} checked={checked} onChange={(value) => platform.connected && togglePlatform(platform.id, value)} />
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {tab === 'pricing' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Selling Price (₹)" required>
              <input className="field" type="number" min={0} value={draft.price || ''} onChange={(event) => set('price', number(event.target.value))} placeholder="0" />
            </FormField>
            <FormField label="Cost Price (₹)">
              <input className="field" type="number" min={0} value={draft.cost || ''} onChange={(event) => set('cost', number(event.target.value))} placeholder="0" />
            </FormField>
            <FormField label="Stock Quantity">
              <input className="field" type="number" min={0} value={draft.stock} onChange={(event) => set('stock', number(event.target.value))} />
            </FormField>
            <FormField label="Reorder Level">
              <input className="field" type="number" min={0} value={draft.reorderLevel} onChange={(event) => set('reorderLevel', number(event.target.value))} />
            </FormField>
            <div className="rounded-card bg-surface-muted p-4 sm:col-span-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Profit per unit</span>
                <span className="font-bold">{formatCurrency(Math.max(0, draft.price - draft.cost))}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-text-muted">Margin</span>
                <span className="font-bold text-success">{margin}%</span>
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}
