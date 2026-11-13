import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { initialCustomers, initialExpenses, initialOrders, initialPlatforms, initialProducts, initialSyncLogs } from '../data/mock'
import type { CartLine, Customer, Expense, Invoice, Platform, PlatformId, PlatformOrder, Product, StockStatus, SyncLog } from '../data/types'

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
  products: Product[]
  customers: Customer[]
  expenses: Expense[]
  platforms: Platform[]
  orders: PlatformOrder[]
  syncLogs: SyncLog[]
  cart: CartLine[]
  salesToday: { total: number; orders: number }
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

/**
 * In-memory demo store. Swap the initial data and mutators for API calls
 * (see VITE_API_BASE_URL) without touching the pages that consume it.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState(initialProducts)
  const [customers, setCustomers] = useState(initialCustomers)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [platforms, setPlatforms] = useState(initialPlatforms)
  const [orders] = useState(initialOrders)
  const [syncLogs, setSyncLogs] = useState(initialSyncLogs)
  const [cart, setCart] = useState<CartLine[]>([])
  const [salesToday, setSalesToday] = useState({ total: 89090, orders: 46 })
  const [invoiceSeq, setInvoiceSeq] = useState(1057)

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
    setPlatforms((list) => list.map((item) => (item.id === id ? { ...item, connected: !item.connected } : item)))
  }, [])

  const updatePlatform = useCallback((id: PlatformId, changes: Partial<Platform>) => setPlatforms((list) => list.map((item) => (item.id === id ? { ...item, ...changes } : item))), [])

  const syncPlatform = useCallback((id: PlatformId) => {
    const now = new Date().toISOString()
    setPlatforms((list) => list.map((item) => (item.id === id ? { ...item, lastSync: now } : item)))
    setSyncLogs((logs) => [
      { id: `LOG-${78232 + logs.length}`, platform: id, event: 'Manual Sync', sku: 'All products', time: now, status: 'Success', message: 'Catalogue, prices and inventory synced.' },
      ...logs,
    ])
  }, [])

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
    () => ({ products, customers, expenses, platforms, orders, syncLogs, cart, salesToday, saveProduct, deleteProduct, adjustStock, addCustomer, updateCustomer, addExpense, deleteExpense, togglePlatform, updatePlatform, syncPlatform, addToCart, setCartQty, clearCart, completeSale }),
    [products, customers, expenses, platforms, orders, syncLogs, cart, salesToday, saveProduct, deleteProduct, adjustStock, addCustomer, updateCustomer, addExpense, deleteExpense, togglePlatform, updatePlatform, syncPlatform, addToCart, setCartQty, clearCart, completeSale],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
