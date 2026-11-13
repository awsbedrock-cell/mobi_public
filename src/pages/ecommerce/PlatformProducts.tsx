import { ListX, MoreVertical, Pencil, Plus, Settings, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PlatformStack } from '../../components/ecommerce/PlatformLogo'
import { emptyProduct, ProductFormModal } from '../../components/products/ProductFormModal'
import { ProductCell } from '../../components/products/ProductThumb'
import { Badge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Dropdown, DropdownItem } from '../../components/ui/Dropdown'
import { Modal } from '../../components/ui/Modal'
import { Checkbox, SearchInput, Select } from '../../components/ui/Field'
import { PageHeader, Toolbar } from '../../components/ui/Misc'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../components/ui/Toast'
import { useStore } from '../../context/StoreContext'
import type { PlatformId, Product } from '../../data/types'
import { formatCurrency } from '../../lib/utils'

const PAGE_SIZE = 6

/** Listing table. Pass `lockedPlatform` to embed it in a single marketplace's dashboard. */
export function ProductListings({ lockedPlatform }: { lockedPlatform?: PlatformId }) {
  const { products, platforms, saveProduct, deleteProduct } = useStore()
  const notify = useToast()
  const [query, setQuery] = useState('')
  const [platformFilter, setPlatform] = useState('all')
  const platform = lockedPlatform ?? platformFilter
  const [removing, setRemoving] = useState<Product | null>(null)
  const [listing, setListing] = useState('Listing Status')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [form, setForm] = useState<{ product: Product; tab: 'details' | 'listing' } | null>(null)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return products.filter(
      (product) =>
        (platform === 'all' || product.platforms.some((id) => id === platform)) &&
        (listing === 'Listing Status' || (listing === 'Listed') === product.platforms.length > 0) &&
        (!term || [product.name, product.sku, product.barcode].some((field) => field.toLowerCase().includes(term))),
    )
  }, [products, query, platform, listing])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const toggle = (id: string, checked: boolean) => setSelected((list) => (checked ? [...list, id] : list.filter((item) => item !== id)))

  const listEverywhere = () => {
    const all = platforms.filter((item) => item.connected).map((item) => item.id)
    products.filter((product) => selected.includes(product.id)).forEach((product) => saveProduct({ ...product, platforms: all }))
    notify(`${selected.length} product${selected.length > 1 ? 's' : ''} listed on ${all.length} platforms`)
    setSelected([])
  }

  const columns: Column<Product>[] = [
    { key: 'select', header: <Checkbox label="Select all on this page" checked={rows.length > 0 && rows.every((row) => selected.includes(row.id))} onChange={(checked) => setSelected(checked ? rows.map((row) => row.id) : [])} />, mobile: 'hidden', render: (product) => <Checkbox label={`Select ${product.name}`} checked={selected.includes(product.id)} onChange={(checked) => toggle(product.id, checked)} /> },
    { key: 'product', header: 'Product', mobile: 'title', render: (product) => <ProductCell product={product} /> },
    { key: 'sku', header: 'SKU', mobile: 'hidden', render: (product) => <span className="whitespace-nowrap text-text-muted">{product.sku}</span> },
    { key: 'price', header: 'Price', align: 'right', render: (product) => <span className="font-bold">{formatCurrency(product.price)}</span> },
    { key: 'platforms', header: 'Platforms', render: (product) => (product.platforms.length ? <PlatformStack ids={product.platforms} /> : <span className="text-text-subtle">—</span>) },
    { key: 'status', header: 'Status', render: (product) => <Badge tone={product.platforms.length ? 'success' : 'neutral'}>{product.platforms.length ? 'Listed' : 'Not Listed'}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      mobile: 'aside',
      render: (product) => (
        <span className="inline-flex">
          <IconButton label={`Edit ${product.name}`} tone="primary" onClick={() => setForm({ product, tab: 'details' })}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <Dropdown
            trigger={({ toggle, open }) => (
              <IconButton label={`More actions for ${product.name}`} onClick={toggle} aria-expanded={open} aria-haspopup="menu">
                <MoreVertical className="h-4 w-4" />
              </IconButton>
            )}
          >
            {(close) => (
              <>
                <DropdownItem
                  icon={<Settings className="h-4 w-4" />}
                  onClick={() => {
                    setForm({ product, tab: 'listing' })
                    close()
                  }}
                >
                  Listing settings
                </DropdownItem>
                {product.platforms.length > 0 && (
                  <DropdownItem
                    icon={<ListX className="h-4 w-4" />}
                    onClick={() => {
                      saveProduct({ ...product, platforms: [] })
                      notify(`${product.name} unlisted from all platforms`, 'info')
                      close()
                    }}
                  >
                    Unlist everywhere
                  </DropdownItem>
                )}
                <DropdownItem
                  icon={<Trash2 className="h-4 w-4 text-error" />}
                  onClick={() => {
                    setRemoving(product)
                    close()
                  }}
                >
                  Delete product
                </DropdownItem>
              </>
            )}
          </Dropdown>
        </span>
      ),
    },
  ]

  const actions = (
    <>
      {selected.length > 0 && (
        <Button variant="secondary" onClick={listEverywhere}>
          List {selected.length} Everywhere
        </Button>
      )}
      <Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ product: emptyProduct(lockedPlatform ? { platforms: [lockedPlatform] } : {}), tab: 'details' })}>
        Add Product
      </Button>
    </>
  )

  return (
    <>
      {lockedPlatform ? <div className="mb-3 flex flex-wrap justify-end gap-2">{actions}</div> : <PageHeader title="Products" crumbs={[{ label: 'E-commerce Platforms', to: '/ecommerce' }, { label: 'Products' }]} actions={actions} />}
      <Card>
        <Toolbar>
          <SearchInput className="flex-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by product name, SKU or barcode…" aria-label="Search listed products" />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {!lockedPlatform && <Select aria-label="Filter by platform" className="sm:w-40" value={platform} onChange={(event) => setPlatform(event.target.value)} options={[{ value: 'all', label: 'All Platforms' }, ...platforms.map((item) => ({ value: item.id, label: item.name }))]} />}
            <Select aria-label="Filter by listing status" className="sm:w-40" value={listing} onChange={(event) => setListing(event.target.value)} options={['Listing Status', 'Listed', 'Not Listed']} />
          </div>
        </Toolbar>
        <DataTable columns={columns} rows={rows} rowKey={(product) => product.id} empty="No products match your filters." />
        <div className="border-t border-border">
          <Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} noun="products" />
        </div>
      </Card>
      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Delete product?"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (removing) {
                  deleteProduct(removing.id)
                  setSelected((list) => list.filter((item) => item !== removing.id))
                  notify(`${removing.name} deleted`, 'info')
                }
                setRemoving(null)
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          <span className="font-semibold text-text">{removing?.name}</span> will be removed from your catalogue and unlisted from {removing?.platforms.length ?? 0} platform{removing?.platforms.length === 1 ? '' : 's'}. This can't be undone.
        </p>
      </Modal>
      {form && <ProductFormModal product={form.product} initialTab={form.tab} onClose={() => setForm(null)} />}
    </>
  )
}

export default function PlatformProducts() {
  return <ProductListings />
}
