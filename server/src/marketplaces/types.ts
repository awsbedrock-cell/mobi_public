export type PlatformId = 'amazon' | 'flipkart' | 'myntra' | 'nykaa' | 'meesho' | 'blinkit'

export interface CredentialField {
  key: string
  label: string
  secret: boolean
  placeholder?: string
}

/** Order in the shape the Mobi app displays. */
export interface MarketplaceOrder {
  id: string
  platform: PlatformId
  customer: string
  amount: number
  date: string
  status: 'Shipped' | 'Processing' | 'Delivered' | 'Cancelled'
  address: string
  trackingId: string
  courier: string
  delivery: string
  lines: { productId: string; name: string; sku: string; qty: number; price: number }[]
}

/** One of the seller's own listings on a marketplace. `ref` holds the identifiers needed to update it later. */
export interface MarketplaceListing {
  sku: string
  name: string
  price: number
  stock: number
  ref: Record<string, string>
}

export interface ListingUpdate {
  sku: string
  price: number
  stock: number
  ref: Record<string, string>
}

/** Outcome for one SKU; `error` is the marketplace's own message when it refused the update. */
export interface PushResult {
  sku: string
  error?: string
}

export type Credentials = Record<string, string>
export type Fetch = typeof fetch

export interface Marketplace {
  id: PlatformId
  name: string
  /** False when the platform has no self-service seller API; access must be granted by the platform. */
  available: boolean
  note: string
  docsUrl: string
  fields: CredentialField[]
  /** Throws MarketplaceError when the credentials are rejected. Returns the seller identifier to display. */
  verify?(credentials: Credentials, fetcher?: Fetch): Promise<string>
  fetchOrders?(credentials: Credentials, since: Date, fetcher?: Fetch): Promise<MarketplaceOrder[]>
  /** The seller's own listings, read through the seller API. */
  fetchListings?(credentials: Credentials, fetcher?: Fetch): Promise<MarketplaceListing[]>
  /** Sends Mobi's price and stock for listings that were imported earlier. */
  pushListings?(credentials: Credentials, updates: ListingUpdate[], fetcher?: Fetch): Promise<PushResult[]>
}

export class MarketplaceError extends Error {}

export async function readJson(response: Response, what: string) {
  const text = await response.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    /* non-JSON error page */
  }
  if (!response.ok) {
    const detail = (body as { errors?: { message?: string; description?: string }[]; error_description?: string; message?: string } | null) ?? {}
    throw new MarketplaceError(`${what} failed (HTTP ${response.status}): ${detail.errors?.[0]?.message ?? detail.errors?.[0]?.description ?? detail.error_description ?? detail.message ?? (text.slice(0, 160) || 'no details')}`)
  }
  return body as Record<string, any>
}
