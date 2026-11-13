import { Download, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProductThumb } from '../components/products/ProductThumb'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Avatar, PageHeader } from '../components/ui/Misc'
import { useToast } from '../components/ui/Toast'
import { useStore } from '../context/StoreContext'
import { categories } from '../data/mock'
import { downloadCsv, formatCurrency } from '../lib/utils'

export function Categories() {
  const { products } = useStore()
  return (
    <>
      <PageHeader title="Categories" subtitle="How your catalogue is organised." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const items = products.filter((product) => product.category === category)
          const value = items.reduce((sum, product) => sum + product.price * product.stock, 0)
          return (
            <Card key={category} className="flex items-center gap-4 p-4">
              <ProductThumb category={category} className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{category}</p>
                <p className="text-xs text-text-muted">
                  {items.length} products · {formatCurrency(value)} stock value
                </p>
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}

export function Brands() {
  const { products } = useStore()
  const names = [...new Set(products.map((product) => product.brand))].sort()
  return (
    <>
      <PageHeader title="Brands" subtitle="Brands you currently stock." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {names.map((brand) => {
          const items = products.filter((product) => product.brand === brand)
          return (
            <Card key={brand} className="flex items-center gap-3 p-4">
              <Avatar name={brand} />
              <div className="min-w-0">
                <p className="truncate font-bold">{brand}</p>
                <p className="text-xs text-text-muted">
                  {items.length} product{items.length > 1 ? 's' : ''} · {items.reduce((sum, product) => sum + product.stock, 0)} units
                </p>
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}

export function ImportExport() {
  const { products } = useStore()
  const notify = useToast()
  const exportAll = () => {
    downloadCsv(
      'mobi-products.csv',
      products.map(({ name, sku, barcode, category, brand, price, cost, stock }) => ({ name, sku, barcode, category, brand, price, cost, stock })),
    )
    notify(`${products.length} products exported`)
  }
  return (
    <>
      <PageHeader title="Import / Export" subtitle="Move your catalogue in and out as CSV." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Upload className="h-5 w-5" />
          </span>
          <p className="mt-3 text-base font-bold">Import products</p>
          <p className="mt-1 text-sm text-text-muted">Upload a CSV to add many products at once. Existing SKUs are skipped.</p>
          <Link to="/products/add?mode=bulk" className="mt-4 inline-block">
            <Button variant="secondary">Go to Bulk Upload</Button>
          </Link>
        </Card>
        <Card className="p-5">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-success-soft text-success">
            <Download className="h-5 w-5" />
          </span>
          <p className="mt-3 text-base font-bold">Export products</p>
          <p className="mt-1 text-sm text-text-muted">Download all {products.length} products with pricing and stock as a CSV file.</p>
          <Button className="mt-4" onClick={exportAll}>
            Export CSV
          </Button>
        </Card>
      </div>
    </>
  )
}
