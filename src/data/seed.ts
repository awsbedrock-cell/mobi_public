import type { StoreType } from '../branding/types'
import { initialCustomers, initialExpenses, initialOrders, initialPlatforms, initialProducts, initialSyncLogs, platformTrend, salesByCategory, salesByPeriod, salesToday } from './mock'
import type { Customer, Expense, Platform, PlatformOrder, Product, SyncLog } from './types'

type Point = { label: string; value: number }

export interface StoreMetrics {
  /** Sales volume of this store relative to the reference store. */
  factor: number
  trend: Point[]
  salesByPeriod: Record<keyof typeof salesByPeriod, Point[]>
  salesByCategory: Point[]
  platformTrend: Point[]
}

export interface StoreSeed {
  products: Product[]
  customers: Customer[]
  expenses: Expense[]
  platforms: Platform[]
  orders: PlatformOrder[]
  syncLogs: SyncLog[]
  salesToday: { total: number; orders: number }
  invoiceSeq: number
  metrics: StoreMetrics
}

const REFERENCE_SCOPE = 'mobi:main'

const reference = (): StoreSeed => ({
  products: initialProducts,
  customers: initialCustomers,
  expenses: initialExpenses,
  platforms: initialPlatforms,
  orders: initialOrders,
  syncLogs: initialSyncLogs,
  salesToday: { total: 89090, orders: 46 },
  invoiceSeq: 1057,
  metrics: { factor: 1, trend: salesToday, salesByPeriod: { Daily: [...salesByPeriod.Daily], Weekly: [...salesByPeriod.Weekly], Monthly: [...salesByPeriod.Monthly] }, salesByCategory, platformTrend },
})

/** Deterministic pseudo-random generator, so a store always gets the same sample data. */
function rng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

const profile: Record<StoreType, { sales: number; stock: number; keep: number }> = {
  'Retail Store': { sales: 1, stock: 1, keep: 0.85 },
  Outlet: { sales: 0.55, stock: 0.6, keep: 0.6 },
  Warehouse: { sales: 0.4, stock: 2.6, keep: 0.4 },
}

/**
 * Sample data for one brand + store. Stands in for a per-store API response:
 * each scope gets its own stock, customers, expenses, orders and sales figures.
 */
export function seedStore(scope: string, type: StoreType): StoreSeed {
  if (scope === REFERENCE_SCOPE) return reference()
  const base = reference()
  const next = rng(scope)
  const shape = profile[type]
  const factor = Math.round(shape.sales * (0.6 + next() * 0.9) * 100) / 100
  const vary = (value: number, by = factor) => Math.max(0, Math.round(value * by * (0.8 + next() * 0.4)))
  const points = (list: readonly Point[]) => list.map((point) => ({ label: point.label, value: vary(point.value) }))
  const subset = <T,>(list: T[], min: number) => {
    const kept = list.filter(() => next() < shape.keep)
    return kept.length >= min ? kept : list.slice(0, min)
  }

  const shares = salesByCategory.map((item) => ({ label: item.label, value: Math.max(1, vary(item.value, 1)) }))
  const total = shares.reduce((sum, item) => sum + item.value, 0)

  return {
    products: base.products.map((product) => ({ ...product, stock: next() < 0.08 ? 0 : vary(product.stock, shape.stock) })),
    customers: subset(base.customers, 3).map((customer) => ({ ...customer, totalPurchase: vary(customer.totalPurchase) })),
    expenses: subset(base.expenses, 4).map((expense) => ({ ...expense, amount: Math.round(vary(expense.amount, Math.max(0.4, factor)) / 10) * 10 })),
    platforms: base.platforms.map((platform) => ({ ...platform, listed: vary(platform.listed, shape.stock > 1 ? 1.2 : 0.8), orders: vary(platform.orders), sales: vary(platform.sales) })),
    orders: subset(base.orders, 4),
    syncLogs: subset(base.syncLogs, 4),
    salesToday: { total: vary(base.salesToday.total), orders: Math.max(1, vary(base.salesToday.orders)) },
    invoiceSeq: 1000 + Math.floor(next() * 900),
    metrics: {
      factor,
      trend: points(salesToday),
      salesByPeriod: { Daily: points(salesByPeriod.Daily), Weekly: points(salesByPeriod.Weekly), Monthly: points(salesByPeriod.Monthly) },
      salesByCategory: shares.map((item) => ({ label: item.label, value: Math.round((item.value / total) * 100) })).sort((a, b) => b.value - a.value),
      platformTrend: points(platformTrend),
    },
  }
}
