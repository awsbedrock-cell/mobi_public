import { CheckCircle2, CloudUpload, Download, HelpCircle, PackageSearch, PencilLine, ScanLine, Sparkles } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarcodeScanner } from '../components/products/BarcodeScanner'
import { emptyProduct, ProductFormModal } from '../components/products/ProductFormModal'
import { ProductCell } from '../components/products/ProductThumb'
import { StockBadge } from '../components/products/StockBadge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/Misc'
import { Modal } from '../components/ui/Modal'
import { Tabs } from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { useStore } from '../context/StoreContext'
import { brands } from '../data/mock'
import type { Product, ProductCategory } from '../data/types'
import { downloadCsv, formatCurrency } from '../lib/utils'

type Mode = 'scan' | 'manual' | 'bulk'

const modes = [
  { value: 'scan' as const, label: 'Scan Product', icon: <ScanLine className="h-4 w-4" /> },
  { value: 'manual' as const, label: 'Manual Entry', icon: <PencilLine className="h-4 w-4" /> },
  { value: 'bulk' as const, label: 'Bulk Upload', icon: <CloudUpload className="h-4 w-4" /> },
]

const autoFilled = ['Product name', 'Brand and model', 'SKU / IMEI', 'Storage and colour (if available)', 'Category and price']

const csvHeaders = ['name', 'sku', 'barcode', 'category', 'brand', 'price', 'cost', 'stock']
const validCategories: ProductCategory[] = ['Smartphones', 'Audio', 'Wearables', 'Accessories', 'Chargers']

const colours = ['black', 'white', 'blue', 'red', 'green', 'silver', 'gold', 'grey', 'gray', 'purple', 'pink', 'yellow', 'titanium', 'midnight', 'starlight']
const categoryHints: Array<[RegExp, ProductCategory]> = [
  [/(buds|airdopes|earphone|headphone|speaker|airpods|neckband)/i, 'Audio'],
  [/(watch|band|fitbit)/i, 'Wearables'],
  [/(charger|adapter|power ?bank|cable|\d+ ?w\b)/i, 'Chargers'],
  [/(case|cover|guard|glass|protector|holder|stand)/i, 'Accessories'],
  [/(phone|galaxy|pixel|redmi|oneplus|\d+ ?gb|\d+ ?tb)/i, 'Smartphones'],
]
const brandAliases: Record<string, string> = { iphone: 'Apple', airpods: 'Apple', galaxy: 'Samsung', redmi: 'Xiaomi', pixel: 'Google' }

/**
 * Reads brand, category, storage and colour out of a typed product name.
 * Runs in the browser with simple rules — no external AI service is called.
 */
function analyseProductName(text: string, knownBrands: string[]): { product: Product; found: string[] } {
  const name = text.trim().replace(/\s+/g, ' ')
  const lower = name.toLowerCase()
  const alias = Object.keys(brandAliases).find((key) => lower.includes(key))
  const brand = knownBrands.find((item) => lower.includes(item.toLowerCase())) ?? (alias ? brandAliases[alias] : undefined)
  const category = categoryHints.find(([pattern]) => pattern.test(name))?.[1]
  const storage = name.match(/\b(\d+) ?(gb|tb)\b/i)
  const colour = colours.find((item) => lower.includes(item))
  const sku = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => (/^\d/.test(word) ? word : word.slice(0, 3)))
    .join('-')
  const found = [brand && `Brand: ${brand}`, category && `Category: ${category}`, storage && `Storage: ${storage[1]}${storage[2].toUpperCase()}`, colour && `Colour: ${colour[0].toUpperCase()}${colour.slice(1)}`].filter((item): item is string => Boolean(item))
  const description = [storage && `${storage[1]}${storage[2].toUpperCase()} storage`, colour && `${colour} colour`].filter(Boolean).join(', ')
  return { product: emptyProduct({ name, sku, brand: brand ?? 'MOBI', category: category ?? 'Accessories', description }), found }
}

function parseCsv(text: string): Product[] {
  const [head, ...lines] = text.split(/\r?\n/).filter((line) => line.trim())
  const headers = head.split(',').map((cell) => cell.trim().toLowerCase().replace(/"/g, ''))
  return lines.flatMap((line, index) => {
    const cells = line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
    const get = (key: string) => cells[headers.indexOf(key)] ?? ''
    if (!get('name') || !get('sku')) return []
    const category = validCategories.find((item) => item.toLowerCase() === get('category').toLowerCase()) ?? 'Accessories'
    return [emptyProduct({ id: `p${Date.now()}-${index}`, name: get('name'), sku: get('sku').toUpperCase(), barcode: get('barcode'), category, brand: get('brand') || 'MOBI', price: Number(get('price')) || 0, cost: Number(get('cost')) || 0, stock: Number(get('stock')) || 0 })]
  })
}

export default function AddProduct() {
  const { products, saveProduct } = useStore()
  const notify = useToast()
  const [params, setParams] = useSearchParams()
  const mode = (['scan', 'manual', 'bulk'].includes(params.get('mode') ?? '') ? params.get('mode') : 'scan') as Mode
  const [found, setFound] = useState<Product | null>(null)
  const [draft, setDraft] = useState<Product | null>(null)
  const [help, setHelp] = useState(false)
  const [name, setName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const onDetected = useCallback(
    (code: string) => {
      const match = products.find((product) => product.barcode === code || product.sku.toLowerCase() === code.toLowerCase())
      if (match) {
        setFound(match)
        notify(`Found ${match.name}`)
      } else {
        setFound(null)
        setDraft(emptyProduct({ barcode: code }))
        notify('New barcode — fill in the product details', 'info')
      }
    },
    [products, notify],
  )

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const rows = parseCsv(await file.text()).filter((row) => !products.some((product) => product.sku === row.sku))
    rows.forEach(saveProduct)
    notify(rows.length ? `${rows.length} product${rows.length > 1 ? 's' : ''} imported` : 'No new products found in that file', rows.length ? 'success' : 'error')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <PageHeader
        title="Add New Product"
        subtitle="Scan a barcode, enter details by hand, or upload many at once."
        actions={
          <Button variant="outline" icon={<HelpCircle className="h-4 w-4" />} onClick={() => setHelp(true)}>
            How it works
          </Button>
        }
      />

      <Tabs items={modes} value={mode} onChange={(value) => setParams({ mode: value }, { replace: true })} className="mb-4 sm:[&>button]:flex-1 sm:[&>button]:justify-center" />

      {mode === 'scan' && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Card className="p-4 sm:p-6">
              <BarcodeScanner onDetected={onDetected} sampleCodes={products.map((product) => product.barcode).filter(Boolean)} />
            </Card>

            {found ? (
              <Card className="flex flex-col p-4 sm:p-5">
                <p className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-success">
                  <CheckCircle2 className="h-5 w-5" /> Product found
                </p>
                <ProductCell product={found} subtitle={`${found.brand} · ${found.sku}`} />
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-text-muted">Price</dt>
                    <dd className="font-bold">{formatCurrency(found.price)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">In stock</dt>
                    <dd className="font-bold">{found.stock} units</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">Barcode</dt>
                    <dd className="font-semibold">{found.barcode}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">Status</dt>
                    <dd>
                      <StockBadge product={found} />
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
                  <Button onClick={() => setDraft(found)}>Edit Details</Button>
                  <Button variant="outline" onClick={() => setFound(null)}>
                    Scan Another
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="border-success/30 bg-success-soft/60 p-4 sm:p-5">
                <CheckCircle2 className="mx-auto h-9 w-9 text-success" />
                <p className="mt-2 text-center font-bold">Product details will be filled automatically</p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {autoFilled.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <Card className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">AI Product Scan (Optional)</p>
                <p className="text-xs text-text-muted">No barcode? Type or paste the product name and Mobi fills in the brand, category, storage, colour and a suggested SKU for you to review.</p>
                <form
                  className="mt-3 flex flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!name.trim()) return
                    const result = analyseProductName(name, brands)
                    setDraft(result.product)
                    notify(result.found.length ? `Detected ${result.found.join(' · ')}` : 'Nothing detected — fill in the details by hand', result.found.length ? 'success' : 'info')
                  }}
                >
                  <input className="field flex-1" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Samsung Galaxy S25 256GB Blue" aria-label="Product name for AI scan" />
                  <Button type="submit" variant="secondary" icon={<Sparkles className="h-4 w-4" />}>
                    Detect Details
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        </div>
      )}

      {mode === 'manual' && (
        <Card className="flex flex-col items-center gap-3 p-8 text-center sm:p-12">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <PackageSearch className="h-7 w-7" />
          </span>
          <p className="text-lg font-bold">Enter product details by hand</p>
          <p className="max-w-md text-sm text-text-muted">Add the name, SKU, pricing and stock, then choose which marketplaces to list it on.</p>
          <Button icon={<PencilLine className="h-4 w-4" />} onClick={() => setDraft(emptyProduct())}>
            Open Product Form
          </Button>
        </Card>
      )}

      {mode === 'bulk' && (
        <Card className="p-4 sm:p-6">
          <label
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              void onFile(event.dataTransfer.files[0])
            }}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-primary/40 bg-primary-soft/40 px-4 py-10 text-center transition-colors hover:bg-primary-soft"
          >
            <CloudUpload className="h-10 w-10 text-primary" />
            <span className="font-bold">Drop a CSV file here or tap to browse</span>
            <span className="text-xs text-text-muted">Columns: {csvHeaders.join(', ')}</span>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void onFile(event.target.files?.[0])} />
          </label>
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-text-muted">Rows with an existing SKU are skipped, so re-uploading is safe.</p>
            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={() => downloadCsv('mobi-products-template.csv', [{ name: 'Sample Phone Case', sku: 'CASE-999', barcode: '8901234569999', category: 'Accessories', brand: 'MOBI', price: 499, cost: 150, stock: 25 }])}
            >
              Download Template
            </Button>
          </div>
        </Card>
      )}

      {draft && (
        <ProductFormModal
          key={draft.id + draft.barcode + draft.name}
          product={draft}
          onClose={() => {
            setDraft(null)
            setFound(null)
            setName('')
          }}
        />
      )}

      <Modal open={help} onClose={() => setHelp(false)} title="How adding products works" size="md" footer={<Button onClick={() => setHelp(false)}>Got it</Button>}>
        <ol className="space-y-3 text-sm">
          {['Scan the barcode, IMEI or QR code on the product box — or type it in.', 'If the product is already in your catalogue, its details load instantly.', 'For a new product, confirm the details, set price and stock.', 'Pick marketplaces under “Listing (Platforms)” and save to list everywhere.'].map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-fg">{index + 1}</span>
              <span className="text-text-muted">{step}</span>
            </li>
          ))}
        </ol>
      </Modal>
    </>
  )
}
