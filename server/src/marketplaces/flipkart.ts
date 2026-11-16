import { MarketplaceError, readJson, type Credentials, type Fetch, type Marketplace, type MarketplaceListing, type MarketplaceOrder } from './types.ts'

/**
 * Flipkart Marketplace Seller API v3.
 * Docs: https://seller.flipkart.com/api-docs/FMSAPI.html — client-credentials OAuth, Search Shipments API, Listing Management API v3.
 */
const BASE = 'https://api.flipkart.net'
const MAX_PAGES = 5
const MAX_LISTINGS = 500
const BATCH = 10 // the listing endpoints accept ten SKUs per call

async function accessToken(credentials: Credentials, fetcher: Fetch) {
  const basic = Buffer.from(`${credentials.appId}:${credentials.appSecret}`).toString('base64')
  const response = await fetcher(`${BASE}/oauth-service/oauth/token?grant_type=client_credentials&scope=Seller_Api`, { headers: { authorization: `Basic ${basic}` } })
  return (await readJson(response, 'Flipkart sign-in')).access_token as string
}

async function post(path: string, body: unknown, token: string, fetcher: Fetch, what: string) {
  const response = await fetcher(`${BASE}${path}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json; charset=utf-8', accept: 'application/json' }, body: JSON.stringify(body) })
  return readJson(response, what)
}

const groups: { type: string; states: string[]; status: MarketplaceOrder['status'] }[] = [
  { type: 'preDispatch', states: ['APPROVED', 'PACKING_IN_PROGRESS', 'PACKED', 'READY_TO_DISPATCH'], status: 'Processing' },
  { type: 'postDispatch', states: ['SHIPPED'], status: 'Shipped' },
  { type: 'postDispatch', states: ['DELIVERED'], status: 'Delivered' },
]

export const flipkart: Marketplace = {
  id: 'flipkart',
  name: 'Flipkart',
  available: true,
  note: 'Uses the Marketplace Seller API. Create a self-access application in the Flipkart Seller API dashboard to get these values.',
  docsUrl: 'https://seller.flipkart.com/api-docs/FMSAPI.html',
  fields: [
    { key: 'appId', label: 'Application ID', secret: false },
    { key: 'appSecret', label: 'Application Secret', secret: true },
  ],
  async verify(credentials, fetcher = fetch) {
    await accessToken(credentials, fetcher)
    return credentials.appId
  },
  async fetchOrders(credentials, since, fetcher = fetch) {
    const token = await accessToken(credentials, fetcher)
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' }
    const orders = new Map<string, MarketplaceOrder>()
    for (const group of groups) {
      const filter = { type: group.type, states: group.states, orderDate: { from: since.toISOString(), to: new Date().toISOString() } }
      let page = await readJson(await fetcher(`${BASE}/sellers/v3/shipments/filter/`, { method: 'POST', headers, body: JSON.stringify({ filter, pagination: { pageSize: 20 } }) }), 'Flipkart orders')
      for (let count = 0; count < MAX_PAGES; count++) {
        for (const shipment of (page.shipments ?? []) as Record<string, any>[]) {
          for (const item of (shipment.orderItems ?? []) as Record<string, any>[]) {
            const qty = Number(item.quantity ?? 1) || 1
            const price = Number(item.priceComponents?.sellingPrice ?? item.priceComponents?.totalPrice ?? 0)
            const order: MarketplaceOrder = orders.get(item.orderId) ?? {
              id: item.orderId,
              platform: 'flipkart',
              // The Search Shipments API does not return buyer details.
              customer: 'Flipkart customer',
              amount: 0,
              date: item.orderDate ?? shipment.updatedAt ?? '',
              status: group.status,
              address: '',
              trackingId: shipment.shipmentId ?? '',
              courier: shipment.shipmentType === 'SELF' ? 'Self ship' : 'Flipkart logistics',
              delivery: shipment.dispatchByDate ?? '',
              lines: [],
            }
            order.lines.push({ productId: '', name: item.title ?? item.sku ?? item.fsn, sku: item.sku ?? '', qty, price })
            order.amount += price * qty
            orders.set(item.orderId, order)
          }
        }
        if (!page.hasMore || !page.nextPageUrl) break
        page = await readJson(await fetcher(`${BASE}/sellers${page.nextPageUrl}`, { headers }), 'Flipkart orders')
      }
    }
    return [...orders.values()]
  },  async fetchListings(credentials, fetcher = fetch) {
    const token = await accessToken(credentials, fetcher)
    const skus: string[] = []
    let pageId: string | null = null
    do {
      const page = await post('/sellers/listings/v3/search', { page_id: pageId }, token, fetcher, 'Flipkart listing search')
      for (const listing of (page.listings ?? []) as Record<string, any>[]) if (listing.sku_id) skus.push(String(listing.sku_id))
      pageId = page.has_more && page.next_page_id ? String(page.next_page_id) : null
    } while (pageId && skus.length < MAX_LISTINGS)

    const listings: MarketplaceListing[] = []
    for (let start = 0; start < Math.min(skus.length, MAX_LISTINGS); start += BATCH) {
      const details = await post('/sellers/listings/v3/details', { sku_ids: skus.slice(start, start + BATCH) }, token, fetcher, 'Flipkart listing details')
      for (const [sku, listing] of Object.entries((details.available ?? {}) as Record<string, Record<string, any>>)) {
        const location = ((listing.locations ?? []) as Record<string, any>[]).find((entry) => entry.status !== 'DISABLED')
        listings.push({
          sku,
          name: listing.product_title ?? sku,
          price: Number(listing.price?.flipkart_selling_price ?? listing.price?.selling_price ?? 0),
          stock: Number(location?.inventory ?? 0),
          ref: { productId: String(listing.product_id ?? ''), locationId: String(location?.id ?? ''), mrp: String(listing.price?.mrp ?? '') },
        })
      }
    }
    return listings
  },
  async pushListings(credentials, updates, fetcher = fetch) {
    const token = await accessToken(credentials, fetcher)
    const errors = new Map<string, string>()
    const send = async (path: string, what: string, batch: typeof updates, payloadOf: (update: (typeof updates)[number]) => Record<string, unknown>) => {
      if (batch.length === 0) return
      try {
        const body = await post(path, Object.fromEntries(batch.map((update) => [update.sku, payloadOf(update)])), token, fetcher, what)
        for (const update of batch) {
          const outcome = body[update.sku] as Record<string, any> | undefined
          if (outcome?.status === 'success' || outcome?.status === 'warning') continue
          errors.set(update.sku, `${what} failed: ${outcome?.errors?.[0]?.description ?? outcome?.attribute_errors?.[0]?.description ?? 'Flipkart did not confirm this SKU'}`)
        }
      } catch (error) {
        if (!(error instanceof MarketplaceError)) throw error
        for (const update of batch) errors.set(update.sku, error.message)
      }
    }
    const known = updates.filter((update) => update.ref.productId)
    for (const update of updates) if (!update.ref.productId) errors.set(update.sku, 'Flipkart product id is unknown. Import the catalogue again.')
    for (let start = 0; start < known.length; start += BATCH) {
      const batch = known.slice(start, start + BATCH)
      await send('/sellers/listings/v3/update/price', 'Flipkart price update', batch, (update) => ({
        product_id: update.ref.productId,
        price: { mrp: Math.max(Number(update.ref.mrp) || 0, Math.round(update.price)), selling_price: Math.round(update.price), currency: 'INR' },
      }))
      // Listings fulfilled by Flipkart have no seller location, so their stock is not ours to set.
      await send('/sellers/listings/v3/update/inventory', 'Flipkart stock update', batch.filter((update) => update.ref.locationId && !errors.has(update.sku)), (update) => ({
        product_id: update.ref.productId,
        locations: [{ id: update.ref.locationId, inventory: update.stock }],
      }))
    }
    return updates.map((update) => ({ sku: update.sku, error: errors.get(update.sku) }))
  },
}
