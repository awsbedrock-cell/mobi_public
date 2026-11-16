import { readJson, type Credentials, type Fetch, type Marketplace, type MarketplaceOrder } from './types.ts'

/**
 * Flipkart Marketplace Seller API v3.
 * Docs: https://seller.flipkart.com/api-docs/FMSAPI.html — client-credentials OAuth, Search Shipments API.
 */
const BASE = 'https://api.flipkart.net'
const MAX_PAGES = 5

async function accessToken(credentials: Credentials, fetcher: Fetch) {
  const basic = Buffer.from(`${credentials.appId}:${credentials.appSecret}`).toString('base64')
  const response = await fetcher(`${BASE}/oauth-service/oauth/token?grant_type=client_credentials&scope=Seller_Api`, { headers: { authorization: `Basic ${basic}` } })
  return (await readJson(response, 'Flipkart sign-in')).access_token as string
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
  },
}
