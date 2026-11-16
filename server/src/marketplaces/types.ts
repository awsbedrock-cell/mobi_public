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
    const detail = (body as { errors?: { message?: string }[]; error_description?: string; message?: string } | null) ?? {}
    throw new MarketplaceError(`${what} failed (HTTP ${response.status}): ${detail.errors?.[0]?.message ?? detail.error_description ?? detail.message ?? (text.slice(0, 160) || 'no details')}`)
  }
  return body as Record<string, any>
}
