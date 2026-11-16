import { readJson, type Credentials, type Fetch, type Marketplace, type MarketplaceOrder } from './types.ts'

/**
 * Amazon Selling Partner API (SP-API), India marketplace.
 * Docs: https://developer-docs.amazon.com/sp-api — Login with Amazon refresh-token flow, Sellers API v1, Orders API v0.
 */
const TOKEN_URL = 'https://api.amazon.com/auth/o2/token'
const ENDPOINT = 'https://sellingpartnerapi-eu.amazon.com' // India is served by the Europe region
const MARKETPLACE_IN = 'A21TJRUUN4KGV'
const MAX_ORDERS = 50

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
  },
}
