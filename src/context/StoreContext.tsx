import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useBrand } from '../branding/BrandProvider'
import { useToast } from '../components/ui/Toast'
import { api, type ApiError, isLive } from '../lib/api'
import { seedStore, type StoreMetrics, type StoreSeed } from '../data/seed'
import type { CartLine, Customer, Expense, Invoice, Platform, PlatformId, PlatformLink, PlatformOrder, Product, StockStatus, SyncLog } from '../data/types'

export function stockStatus(product: Product): StockStatus {
  if (product.stock <= 0) return 'Out of Stock'
  if (product.stock <= product.reorderLevel) return 'Low Stock'
  return 'In Stock'
}

export interface CompletedSale {
  id: string
  total: number
  items: number
}

interface StoreValue {
  /** True when data is loaded from and saved to the Mobi backend. */
  live: boolean
  /** Live mode: verify credentials with the marketplace and store them on the server. Returns an error message, or null. */
  connectPlatform: (id: PlatformId, credentials: Record<string, string>) => Promise<string | null>
  products: Product[]
  customers: Customer[]
  expenses: Expense[]
  platforms: Platform[]
  orders: PlatformOrder[]
  syncLogs: SyncLog[]
  cart: CartLine[]
  salesToday: { total: number; orders: number }
  /** Chart series and sales volume for the active store. */
  metrics: StoreMetrics
  saveProduct: (product: Product) => void
  deleteProduct: (id: string) => void
  adjustStock: (id: string, delta: number) => void
  addCustomer: (customer: Customer) => void
  updateCustomer: (id: string, changes: Partial<Customer>) => void
  addExpense: (expense: Expense) => void
  deleteExpense: (id: string) => void
  togglePlatform: (id: PlatformId) => void
  updatePlatform: (id: PlatformId, changes: Partial<Platform>) => void
  syncPlatform: (id: PlatformId) => void
  addToCart: (productId: string) => void
  setCartQty: (productId: string, qty: number) => void
  clearCart: () => void
  completeSale: (customerId: string | null, total: number, payment?: Invoice['payment']) => CompletedSale
}

const StoreContext = createContext<StoreValue | null>(null)

type Snapshot = Omit<StoreSeed, 'metrics'> & { cart: CartLine[] }

/** Marketplace state as the backend reports it. */
type RemotePlatform = PlatformLink & { id: PlatformId; connected: boolean; sellerId: string; lastSync: string }
interface RemoteState {
  initialised: boolean
  products: Product[]
  customers: Customer[]
  expenses: Expense[]
  orders: PlatformOrder[]
  syncLogs: SyncLog[]
  salesToday: { total: number; orders: number }
  invoiceSeq: number
  platforms: RemotePlatform[]
  error?: string
}

const withLinks = (platforms: Platform[], remote: RemotePlatform[]): Platform[] =>
  platforms.map((platform) => {
    const { id: _id, connected = false, sellerId = '', lastSync = '', ...link } = remote.find((item) => item.id === platform.id) ?? ({ available: false, note: '', docsUrl: '', fields: [], lastError: '' } as Partial<RemotePlatform> & PlatformLink)
    return { ...platform, connected, sellerId, apiKey: undefined, lastSync, link, listed: 0, orders: 0, sales: 0, health: 0 }
  })

/**
 * Store data scoped to the active brand and store.
 * Demo mode (no VITE_API_BASE_URL): in-memory sample data, kept per scope for the session.
 * Live mode: loaded from the Mobi backend and saved back on every change.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const { scope, store } = useBrand()
  const [cache] = useState(() => new Map<string, Snapshot>())
  const seed = () => seedStore(scope, store.type)
  if (isLive) {
    return (
      <LiveStore key={scope} scope={scope} seed={seed}>
        {children}
      </LiveStore>
    )
  }
  return (
    <ScopedStore key={scope} scope={scope} seed={seed} cache={cache}>
      {children}
    </ScopedStore>
  )
}

function LiveStore({ scope, seed, children }: { scope: string; seed: () => StoreSeed; children: ReactNode }) {
  const [sample] = useState(seed)
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<{ attempt: number; state?: RemoteState; error?: string } | null>(null)
  const path = `/api/scopes/${encodeURIComponent(scope)}`

  useEffect(() => {
    let cancelled = false
    const { products, customers, expenses, salesToday, invoiceSeq } = sample
    api<RemoteState>(path)
      // A store seen for the first time starts with sample stock, customers and expenses. Marketplace data is never sampled.
      .then((state) => (state.initialised ? state : api<RemoteState>(`${path}/init`, { body: { products, customers, expenses, salesToday, invoiceSeq } })))
      .then(
        (state) => !cancelled && setLoaded({ attempt, state }),
        (error: Error) => !cancelled && setLoaded({ attempt, error: error.message }),
      )
    return () => {
      cancelled = true
    }
  }, [path, sample, attempt])

  if (!loaded || loaded.attempt !== attempt) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg p-6 text-center text-sm text-text-muted" role="status">
        Loading store data… The server can take up to a minute to wake up.
      </div>
    )
  }
  if (!loaded.state) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg p-6 text-center">
        <div className="max-w-sm space-y-3">
          <p className="font-bold text-text">Could not load store data</p>
          <p className="text-sm text-text-muted">{loaded.error}</p>
          <button type="button" className="rounded-button bg-primary px-4 py-2 text-sm font-semibold text-primary-fg" onClick={() => setAttempt(attempt + 1)}>
            Try again
          </button>
        </div>
      </div>
    )
  }
  const { state } = loaded
  const initial: StoreSeed = { ...sample, products: state.products, customers: state.customers, expenses: state.expenses, orders: state.orders, syncLogs: state.syncLogs, salesToday: state.salesToday, invoiceSeq: state.invoiceSeq, platforms: withLinks(sample.platforms, state.platforms) }
  return (
    <ScopedStore scope={scope} seed={() => initial} remotePath={path}>
      {children}
    </ScopedStore>
  )
}

type Saved = { products: Product[]; customers: Customer[]; expenses: Expense[]; salesToday: { total: number; orders: number }; invoiceSeq: number }
const collections = ['products', 'customers', 'expenses'] as const

/** What changed between two snapshots, in the shape POST /changes accepts. Null when nothing did. */
function changesBetween(before: Saved, after: Saved) {
  const upserts: Record<string, unknown[]> = {}
  const deletes: Record<string, string[]> = {}
  let changed = false
  for (const kind of collections) {
    if (before[kind] === after[kind]) continue
    const old = new Map<string, unknown>(before[kind].map((item) => [item.id, item]))
    const ids = new Set(after[kind].map((item) => item.id))
    // New records are added at the front of a list; reversed so the server keeps that order.
    upserts[kind] = after[kind].filter((item) => old.get(item.id) !== item).reverse()
    deletes[kind] = before[kind].filter((item) => !ids.has(item.id)).map((item) => item.id)
    changed ||= upserts[kind].length > 0 || deletes[kind].length > 0
  }
  const metaChanged = before.salesToday !== after.salesToday || before.invoiceSeq !== after.invoiceSeq
  if (!changed && !metaChanged) return null
  return { upserts, deletes, meta: metaChanged ? { salesToday: after.salesToday, invoiceSeq: after.invoiceSeq } : undefined }
}

function ScopedStore({ scope, seed, cache, remotePath, children }: { scope: string; seed: () => StoreSeed; cache?: Map<string, Snapshot>; remotePath?: string; children: ReactNode }) {
  const live = remotePath !== undefined
  const notify = useToast()
  const [initial] = useState(() => {
    const seeded = seed()
    return { ...seeded, cart: [] as CartLine[], ...cache?.get(scope) }
  })
  const metrics = initial.metrics
  const [products, setProducts] = useState(initial.products)
  const [customers, setCustomers] = useState(initial.customers)
  const [expenses, setExpenses] = useState(initial.expenses)
  const [platformList, setPlatforms] = useState(initial.platforms)
  const [orders, setOrders] = useState(initial.orders)
  const [syncLogs, setSyncLogs] = useState(initial.syncLogs)
  const [cart, setCart] = useState<CartLine[]>(initial.cart)
  const [salesToday, setSalesToday] = useState(initial.salesToday)
  const [invoiceSeq, setInvoiceSeq] = useState(initial.invoiceSeq)

  /** Live mode: marketplace figures are counted from real listings and imported orders, never sampled. */
  const platforms = useMemo(
    () =>
      live
        ? platformList.map((platform) => {
            const own = orders.filter((order) => order.platform === platform.id)
            return {
              ...platform,
              listed: products.filter((product) => product.platforms.includes(platform.id)).length,
              orders: own.length,
              sales: own.reduce((sum, order) => sum + (order.status === 'Cancelled' ? 0 : order.amount), 0),
              health: platform.connected && !platform.link?.lastError ? 100 : 0,
            }
          })
        : platformList,
    [live, platformList, orders, products],
  )

  useEffect(() => {
    cache?.set(scope, { products, customers, expenses, platforms: platformList, orders, syncLogs, cart, salesToday, invoiceSeq })
  }, [cache, scope, products, customers, expenses, platformList, orders, syncLogs, cart, salesToday, invoiceSeq])

  // Live mode: save every change to the backend, one request at a time and in order.
  const saved = useRef<Saved>({ products, customers, expenses, salesToday, invoiceSeq })
  const queue = useRef(Promise.resolve())
  useEffect(() => {
    if (!remotePath) return
    const next: Saved = { products, customers, expenses, salesToday, invoiceSeq }
    const body = changesBetween(saved.current, next)
    saved.current = next
    if (!body) return
    queue.current = queue.current.then(() => api(`${remotePath}/changes`, { body, keepalive: true }).then(() => undefined, (error: Error) => notify(`Changes were not saved: ${error.message}`, 'error')))
  }, [remotePath, notify, products, customers, expenses, salesToday, invoiceSeq])

  const applyRemote = useCallback(
    (state: RemoteState) => {
      setPlatforms((list) => withLinks(list, state.platforms))
      if (state.orders) setOrders(state.orders)
      if (state.syncLogs) setSyncLogs(state.syncLogs)
    },
    [],
  )

  /** Runs a marketplace action on the server. Returns an error message, or null. */
  const platformAction = useCallback(
    async (id: PlatformId, action: 'connect' | 'disconnect' | 'sync', body: unknown = {}) => {
      try {
        applyRemote(await api<RemoteState>(`${remotePath}/platforms/${id}/${action}`, { body }))
        return null
      } catch (error) {
        const failure = error as ApiError
        if (failure.status === 502 && (failure.body as RemoteState | null)?.platforms) applyRemote(failure.body as RemoteState)
        return failure.message
      }
    },
    [remotePath, applyRemote],
  )

  const connectPlatform = useCallback((id: PlatformId, credentials: Record<string, string>) => (live ? platformAction(id, 'connect', { credentials }) : Promise.resolve('The Mobi backend is not configured.')), [live, platformAction])

  const saveProduct = useCallback((product: Product) => {
    setProducts((list) => (list.some((item) => item.id === product.id) ? list.map((item) => (item.id === product.id ? product : item)) : [product, ...list]))
  }, [])

  const deleteProduct = useCallback((id: string) => {
    setProducts((list) => list.filter((item) => item.id !== id))
    setCart((lines) => lines.filter((line) => line.productId !== id))
  }, [])

  const adjustStock = useCallback((id: string, delta: number) => {
    setProducts((list) => list.map((item) => (item.id === id ? { ...item, stock: Math.max(0, item.stock + delta) } : item)))
  }, [])

  const addCustomer = useCallback((customer: Customer) => setCustomers((list) => [customer, ...list]), [])
  const updateCustomer = useCallback((id: string, changes: Partial<Customer>) => setCustomers((list) => list.map((item) => (item.id === id ? { ...item, ...changes } : item))), [])
  const addExpense = useCallback((expense: Expense) => setExpenses((list) => [expense, ...list]), [])
  const deleteExpense = useCallback((id: string) => setExpenses((list) => list.filter((item) => item.id !== id)), [])

  const togglePlatform = useCallback((id: PlatformId) => {
    if (live) {
      const platform = platformList.find((item) => item.id === id)
      if (!platform) return
      if (!platform.connected) return notify(platform.link?.available ? `Enter your ${platform.name} credentials under API Settings to connect.` : `${platform.name} cannot be connected yet. See API Settings.`, 'info')
      void platformAction(id, 'disconnect').then((error) => notify(error ?? `${platform.name} disconnected`, error ? 'error' : 'info'))
      return
    }
    setPlatforms((list) => list.map((item) => (item.id === id ? { ...item, connected: !item.connected } : item)))
  }, [live, platformList, platformAction, notify])

  const updatePlatform = useCallback((id: PlatformId, changes: Partial<Platform>) => setPlatforms((list) => list.map((item) => (item.id === id ? { ...item, ...changes } : item))), [])

  const syncPlatform = useCallback((id: PlatformId) => {
    if (live) {
      const platform = platformList.find((item) => item.id === id)
      if (!platform) return
      if (!platform.connected) return notify(`${platform.name} is not connected.`, 'error')
      notify(`Importing orders from ${platform.name}…`, 'info')
      void platformAction(id, 'sync').then((error) => notify(error ?? `${platform.name} orders imported`, error ? 'error' : 'success'))
      return
    }
    const now = new Date().toISOString()
    setPlatforms((list) => list.map((item) => (item.id === id ? { ...item, lastSync: now } : item)))
    setSyncLogs((logs) => [
      { id: `LOG-${78232 + logs.length}`, platform: id, event: 'Manual Sync', sku: 'All products', time: now, status: 'Success', message: 'Catalogue, prices and inventory synced.' },
      ...logs,
    ])
  }, [live, platformList, platformAction, notify])

  const addToCart = useCallback((productId: string) => {
    setCart((lines) => (lines.some((line) => line.productId === productId) ? lines.map((line) => (line.productId === productId ? { ...line, qty: line.qty + 1 } : line)) : [...lines, { productId, qty: 1 }]))
  }, [])

  const setCartQty = useCallback((productId: string, qty: number) => {
    setCart((lines) => (qty <= 0 ? lines.filter((line) => line.productId !== productId) : lines.map((line) => (line.productId === productId ? { ...line, qty } : line))))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const completeSale = useCallback(
    (customerId: string | null, total: number, payment?: Invoice['payment']): CompletedSale => {
      const id = `INV-${invoiceSeq}`
      const today = new Date().toISOString().slice(0, 10)
      const names = cart.map((line) => products.find((product) => product.id === line.productId)?.name ?? 'Item').join(', ')
      const items = cart.reduce((sum, line) => sum + line.qty, 0)

      setProducts((list) =>
        list.map((product) => {
          const line = cart.find((entry) => entry.productId === product.id)
          return line ? { ...product, stock: Math.max(0, product.stock - line.qty) } : product
        }),
      )
      if (customerId) {
        setCustomers((list) =>
          list.map((customer) =>
            customer.id === customerId
              ? { ...customer, totalPurchase: customer.totalPurchase + total, lastPurchase: today, status: 'Active', invoices: [{ id, date: today, items: names, amount: total, payment }, ...customer.invoices] }
              : customer,
          ),
        )
      }
      setSalesToday((current) => ({ total: current.total + total, orders: current.orders + 1 }))
      setInvoiceSeq((value) => value + 1)
      setCart([])
      return { id, total, items }
    },
    [cart, products, invoiceSeq],
  )

  const value = useMemo<StoreValue>(
    () => ({ live, connectPlatform, products, customers, expenses, platforms, orders, syncLogs, cart, salesToday, metrics, saveProduct, deleteProduct, adjustStock, addCustomer, updateCustomer, addExpense, deleteExpense, togglePlatform, updatePlatform, syncPlatform, addToCart, setCartQty, clearCart, completeSale }),
    [live, connectPlatform, products, customers, expenses, platforms, orders, syncLogs, cart, salesToday, metrics, saveProduct, deleteProduct, adjustStock, addCustomer, updateCustomer, addExpense, deleteExpense, togglePlatform, updatePlatform, syncPlatform, addToCart, setCartQty, clearCart, completeSale],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
