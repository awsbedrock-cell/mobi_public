import { MarketplaceError, readJson, type Credentials, type Fetch, type Marketplace, type MarketplaceListing, type MarketplaceOrder, type PushResult } from './types.ts'

/**
 * Amazon Selling Partner API (SP-API), India marketplace.
 * Docs: https://developer-docs.amazon.com/sp-api — Login with Amazon refresh-token flow, Sellers API v1, Orders API v0, Listings Items API 2021-08-01.
 */
const TOKEN_URL = 'https://api.amazon.com/auth/o2/token'
const ENDPOINT = 'https://sellingpartnerapi-eu.amazon.com' // India is served by the Europe region
const MARKETPLACE_IN = 'A21TJRUUN4KGV'
const MAX_ORDERS = 50
const LISTING_PAGES = 25 // 20 listings per page

async function accessToken(credentials: Credentials, fetcher: Fetch) {
  const response = await fetcher(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: credentials.refreshToken, client_id: credentials.clientId, client_secret: credentials.clientSecret }),
  })
  return (await readJson(response, 'Amazon sign-in')).access_token as string
}

async function call(path: string, token: string, fetcher: Fetch) {
  return readJson(await fetcher(`${ENDPOINT}${path}`, { headers: { 'x-amz-access-token': token, accept: 'application/json' } }), 'Amazon request')
}

const status = (value: string): MarketplaceOrder['status'] => (value === 'Shipped' ? 'Shipped' : value === 'Canceled' || value === 'Unfulfillable' ? 'Cancelled' : 'Processing')

export const amazon: Marketplace = {
  id: 'amazon',
  name: 'Amazon',
  available: true,
  note: 'Uses the Selling Partner API. Register a private app in Seller Central and authorise it to get these values.',
  docsUrl: 'https://developer-docs.amazon.com/sp-api/docs/registering-your-application',
  fields: [
    { key: 'sellerId', label: 'Seller ID (Merchant Token)', secret: false, placeholder: 'A1B2C3D4E5F6G7' },
    { key: 'clientId', label: 'LWA Client ID', secret: false, placeholder: 'amzn1.application-oa2-client…' },
    { key: 'clientSecret', label: 'LWA Client Secret', secret: true },
    { key: 'refreshToken', label: 'Refresh Token', secret: true, placeholder: 'Atzr|…' },
  ],
  async verify(credentials, fetcher = fetch) {
    const token = await accessToken(credentials, fetcher)
    await call('/sellers/v1/marketplaceParticipations', token, fetcher)
    return credentials.sellerId
  },
  async fetchOrders(credentials, since, fetcher = fetch) {
    const token = await accessToken(credentials, fetcher)
    const query = new URLSearchParams({ MarketplaceIds: MARKETPLACE_IN, CreatedAfter: since.toISOString(), MaxResultsPerPage: String(MAX_ORDERS) })
    const list = ((await call(`/orders/v0/orders?${query}`, token, fetcher)).payload?.Orders ?? []) as Record<string, any>[]
    const orders: MarketplaceOrder[] = []
    for (const order of list.slice(0, MAX_ORDERS)) {
      const items = ((await call(`/orders/v0/orders/${encodeURIComponent(order.AmazonOrderId)}/orderItems`, token, fetcher)).payload?.OrderItems ?? []) as Record<string, any>[]
      const address = order.ShippingAddress ?? {}
      orders.push({
        id: order.AmazonOrderId,
        platform: 'amazon',
        // Buyer names are restricted data on SP-API and are not requested here.
        customer: order.BuyerInfo?.BuyerName ?? 'Amazon customer',
        amount: Number(order.OrderTotal?.Amount ?? 0),
        date: order.PurchaseDate,
        status: status(order.OrderStatus),
        address: [address.City, address.StateOrRegion, address.PostalCode].filter(Boolean).join(', '),
        trackingId: '',
        courier: order.FulfillmentChannel === 'AFN' ? 'Fulfilled by Amazon' : 'Seller fulfilled',
        delivery: order.LatestDeliveryDate ?? order.LatestShipDate ?? '',
        lines: items.map((item) => {
          const qty = Number(item.QuantityOrdered ?? 1) || 1
          return { productId: '', name: item.Title ?? item.SellerSKU ?? item.ASIN, sku: item.SellerSKU ?? '', qty, price: Number(item.ItemPrice?.Amount ?? 0) / qty }
        }),
      })
    }
    return orders
  },  async fetchListings(credentials, fetcher = fetch) {
    const token = await accessToken(credentials, fetcher)
    const listings: MarketplaceListing[] = []
    let pageToken: string | undefined
    for (let page = 0; page < LISTING_PAGES; page++) {
      const query = new URLSearchParams({ marketplaceIds: MARKETPLACE_IN, includedData: 'summaries,offers,fulfillmentAvailability', pageSize: '20' })
      if (pageToken) query.set('pageToken', pageToken)
      const body = await call(`/listings/2021-08-01/items/${encodeURIComponent(credentials.sellerId)}?${query}`, token, fetcher)
      for (const item of (body.items ?? []) as Record<string, any>[]) {
        const summary = (item.summaries ?? []).find((entry: Record<string, any>) => entry.marketplaceId === MARKETPLACE_IN) ?? item.summaries?.[0] ?? {}
        const offer = (item.offers ?? []).find((entry: Record<string, any>) => entry.offerType === 'B2C' && entry.marketplaceId === MARKETPLACE_IN)
        // Seller-fulfilled stock is reported under the DEFAULT channel; stock held by Amazon (FBA) cannot be set through this API.
        const own = (item.fulfillmentAvailability ?? []).find((entry: Record<string, any>) => entry.fulfillmentChannelCode === 'DEFAULT')
        listings.push({
          sku: item.sku,
          name: summary.itemName ?? item.sku,
          price: Number(offer?.price?.amount ?? 0),
          stock: Number(own?.quantity ?? 0),
          ref: { asin: summary.asin ?? '', productType: summary.productType ?? '', sellerFulfilled: own ? 'yes' : 'no' },
        })
      }
      pageToken = body.pagination?.nextToken
      if (!pageToken) break
    }
    return listings
  },
  async pushListings(credentials, updates, fetcher = fetch) {
    const token = await accessToken(credentials, fetcher)
    const results: PushResult[] = []
    for (const update of updates) {
      if (!update.ref.productType) {
        results.push({ sku: update.sku, error: 'Amazon product type is unknown. Import the catalogue again.' })
        continue
      }
      const patches: Record<string, unknown>[] = [{ op: 'replace', path: '/attributes/purchasable_offer', value: [{ marketplace_id: MARKETPLACE_IN, currency: 'INR', our_price: [{ schedule: [{ value_with_tax: update.price }] }] }] }]
      if (update.ref.sellerFulfilled === 'yes') patches.push({ op: 'replace', path: '/attributes/fulfillment_availability', value: [{ fulfillment_channel_code: 'DEFAULT', quantity: update.stock }] })
      try {
        const response = await fetcher(`${ENDPOINT}/listings/2021-08-01/items/${encodeURIComponent(credentials.sellerId)}/${encodeURIComponent(update.sku)}?marketplaceIds=${MARKETPLACE_IN}`, {
          method: 'PATCH',
          headers: { 'x-amz-access-token': token, accept: 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify({ productType: update.ref.productType, patches }),
        })
        const body = await readJson(response, 'Amazon update')
        const issue = ((body.issues ?? []) as Record<string, any>[]).find((entry) => entry.severity === 'ERROR')
        results.push(body.status === 'ACCEPTED' ? { sku: update.sku } : { sku: update.sku, error: issue?.message ?? `Amazon answered ${body.status ?? 'without a status'}` })
      } catch (error) {
        if (!(error instanceof MarketplaceError)) throw error
        results.push({ sku: update.sku, error: error.message })
      }
    }
    return results
  },
}
