export type PlatformId = 'amazon' | 'flipkart' | 'myntra' | 'nykaa' | 'meesho' | 'blinkit'

export type ProductCategory = 'Smartphones' | 'Audio' | 'Wearables' | 'Accessories' | 'Chargers'

export interface Product {
  id: string
  name: string
  sku: string
  barcode: string
  category: ProductCategory
  brand: string
  price: number
  cost: number
  stock: number
  reserved: number
  reorderLevel: number
  description: string
  platforms: PlatformId[]
  /** Data URL of the product photo, if one was added. */
  image?: string
}

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'

export interface Invoice {
  id: string
  date: string
  items: string
  amount: number
  payment?: 'Cash' | 'UPI' | 'Card'
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  address: string
  status: 'Active' | 'Inactive'
  totalPurchase: number
  lastPurchase: string
  notes: string
  invoices: Invoice[]
}

export interface Expense {
  id: string
  date: string
  category: string
  description: string
  amount: number
  method: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer'
}

export interface Platform {
  id: PlatformId
  name: string
  marketplace: string
  /** Seller portal opened by "View on …" actions. */
  portalUrl: string
  /** API credentials entered in Platform Settings. Held in memory only. */
  sellerId?: string
  apiKey?: string
  /** Marketplace brand colors are third-party identity, not Mobi theme tokens. */
  brandColor: string
  brandFg: string
  connected: boolean
  lastSync: string
  listed: number
  orders: number
  sales: number
  health: number
}

export type OrderStatus = 'Shipped' | 'Processing' | 'Delivered' | 'Cancelled'

export interface OrderLine {
  productId: string
  name: string
  sku: string
  qty: number
  price: number
}

export interface PlatformOrder {
  id: string
  platform: PlatformId
  customer: string
  amount: number
  date: string
  status: OrderStatus
  address: string
  trackingId: string
  courier: string
  delivery: string
  lines: OrderLine[]
}

export type SyncStatus = 'Success' | 'Failed' | 'Pending'

export interface SyncLog {
  id: string
  platform: PlatformId
  event: string
  sku: string
  time: string
  status: SyncStatus
  message: string
}

export interface CartLine {
  productId: string
  qty: number
}
