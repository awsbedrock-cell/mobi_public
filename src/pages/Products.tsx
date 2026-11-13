import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductFormModal } from '../components/products/ProductFormModal'
import { ProductCell } from '../components/products/ProductThumb'
import { StockBadge } from '../components/products/StockBadge'
import { Button, IconButton } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DataTable, type Column } from '../components/ui/DataTable'
import { SearchInput, Select } from '../components/ui/Field'
import { PageHeader, Toolbar } from '../components/ui/Misc'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { useToast } from '../components/ui/Toast'
import { stockStatus, useStore } from '../context/StoreContext'
import { categories } from '../data/mock'
import type { Product } from '../data/types'
import { formatCurrency } from '../lib/utils'

const PAGE_SIZE = 8

export default function Products() {
  const { products, deleteProduct } = useStore()
  const notify = useToast()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const [category, setCategory] = useState('All Categories')
  const [status, setStatus] = useState('All Status')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Product | null>(null)
  const [removing, setRemoving] = useState<Product | null>(null)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return products.filter(
      (product) =>
        (category === 'All Categories' || product.category === category) &&
        (status === 'All Status' || stockStatus(product) === status) &&
        (!term || [product.name, product.sku, product.barcode, product.brand].some((field) => field.toLowerCase().includes(term))),
    )
  }, [products, query, category, status])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const columns: Column<Product>[] = [
    { key: 'product', header: 'Product', mobile: 'title', render: (product) => <ProductCell product={product} subtitle={product.brand} /> },
    { key: 'sku', header: 'SKU', render: (product) => <span className="whitespace-nowrap text-text-muted">{product.sku}</span> },
    { key: 'category', header: 'Category', render: (product) => product.category },
    { key: 'price', header: 'Price', align: 'right', render: (product) => <span className="font-bold">{formatCurrency(product.price)}</span> },
    { key: 'stock', header: 'Stock', align: 'right', render: (product) => product.stock },
    { key: 'status', header: 'Status', render: (product) => <StockBadge product={product} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      mobile: 'aside',
      render: (product) => (
        <span className="inline-flex">
          <IconButton label={`Edit ${product.name}`} tone="primary" onClick={() => setEditing(product)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label={`Delete ${product.name}`} tone="danger" onClick={() => setRemoving(product)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={`Products (${products.length})`}
        subtitle="Your full catalogue across the store and marketplaces."
        actions={
          <Link to="/products/add">
            <Button icon={<Plus className="h-4 w-4" />}>Add Product</Button>
          </Link>
        }
      />
      <Card>
        <Toolbar>
          <SearchInput
            className="flex-1"
            value={query}
            onChange={(event) => setParams(event.target.value ? { q: event.target.value } : {}, { replace: true })}
            placeholder="Search by product name, SKU or barcode…"
            aria-label="Search products"
          />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select aria-label="Filter by category" className="sm:w-44" options={['All Categories', ...categories]} value={category} onChange={(event) => setCategory(event.target.value)} />
            <Select aria-label="Filter by status" className="sm:w-36" options={['All Status', 'In Stock', 'Low Stock', 'Out of Stock']} value={status} onChange={(event) => setStatus(event.target.value)} />
          </div>
        </Toolbar>
        <DataTable columns={columns} rows={rows} rowKey={(product) => product.id} empty="No products match your filters." />
        <div className="border-t border-border">
          <Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} noun="products" />
        </div>
      </Card>

      {editing && <ProductFormModal product={editing} onClose={() => setEditing(null)} />}

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
                  notify(`${removing.name} deleted`)
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
          <span className="font-semibold text-text">{removing?.name}</span> will be removed from your catalogue and unlisted from every connected platform.
        </p>
      </Modal>
    </>
  )
}
