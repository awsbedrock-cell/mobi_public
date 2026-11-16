import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { createApp } from '../src/app.ts'
import { createSessions } from '../src/auth.ts'
import { createVault } from '../src/crypto.ts'
import { openDatabase, type Database } from '../src/db.ts'

const dir = mkdtempSync(join(tmpdir(), 'mobi-'))
const ADMIN = 'admin-secret'
let db: Database
let server: Server
let base = ''
/** Session of the Store Owner; sent with every request unless a test overrides it. */
let token = ''
/** Stand-in for the marketplace servers: tests never call Amazon or Flipkart. */
let remote: (url: string, init?: RequestInit) => Response = () => new Response('{}', { status: 500 })
const calls: string[] = []

async function start() {
  db = await openDatabase('', dir)
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push(String(input))
    return remote(String(input), init)
  }) as typeof fetch
  server = createApp({ db, vault: createVault('test-key'), adminKey: ADMIN, fetcher, sessions: createSessions('test-sessions') }).listen(0)
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
}
const stop = async () => {
  await new Promise((resolve) => server.close(resolve))
  await db.close()
}

async function api(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: response.status, body: (await response.json()) as Record<string, any> }
}
const headersOf = (init?: RequestInit) => (init?.headers ?? {}) as Record<string, string>
const admin = {}
const as = (session: string) => ({ authorization: `Bearer ${session}` })
const owner = { name: 'Nishant', email: 'owner@mobi.test', password: 'owner-pass-1' }
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })
const seed = {
  products: [{ id: 'P1', name: 'Phone', stock: 5 }, { id: 'P2', name: 'Case', stock: 9 }],
  customers: [{ id: 'C1', name: 'Asha' }],
  expenses: [],
  salesToday: { total: 100, orders: 1 },
  invoiceSeq: 1001,
}

before(start)
after(stop)

test('health', async () => {
  assert.deepEqual((await api('/api/health')).body, { ok: true, marketplaceConnections: true })
})

test('nothing is readable or writable without signing in', async () => {
  const anonymous = { authorization: '' }
  assert.deepEqual((await api('/api/auth/status', 'GET', undefined, anonymous)).body, { setupRequired: true, setupAvailable: true })
  for (const path of ['/api/scopes/mobi:main', '/api/brands', '/api/marketplaces', '/api/users', '/api/auth/me']) assert.equal((await api(path, 'GET', undefined, anonymous)).status, 401, path)
  assert.equal((await api('/api/scopes/mobi:main/init', 'POST', seed, anonymous)).status, 401)
  assert.equal((await api('/api/scopes/mobi:main', 'GET', undefined, as('forged.token'))).status, 401)
  assert.equal((await api('/api/scopes/mobi:main', 'GET', undefined, as(createSessions('other-secret').issue('someone')))).status, 401)
})

test('the first owner needs the admin key; setup works once', async () => {
  assert.equal((await api('/api/auth/setup', 'POST', owner)).status, 401)
  assert.equal((await api('/api/auth/setup', 'POST', owner, { 'x-admin-key': 'wrong' })).status, 401)
  assert.equal((await api('/api/auth/setup', 'POST', { ...owner, password: 'short' }, { 'x-admin-key': ADMIN })).status, 400)
  const created = await api('/api/auth/setup', 'POST', owner, { 'x-admin-key': ADMIN })
  assert.equal(created.status, 200)
  assert.deepEqual([created.body.user.role, created.body.user.email, created.body.user.password], ['Store Owner', 'owner@mobi.test', undefined])
  assert.equal((await api('/api/auth/setup', 'POST', { ...owner, email: 'second@mobi.test' }, { 'x-admin-key': ADMIN })).status, 409)
  assert.equal((await api('/api/auth/status')).body.setupRequired, false)
  token = created.body.token
  assert.equal((await api('/api/auth/me')).body.user.name, 'Nishant')
})

test('login, wrong passwords, accounts and password change', async () => {
  assert.equal((await api('/api/auth/login', 'POST', { email: 'OWNER@mobi.test ', password: owner.password })).status, 200)
  assert.equal((await api('/api/auth/login', 'POST', { email: owner.email, password: 'nope' })).status, 401)
  assert.equal((await api('/api/auth/login', 'POST', { email: 'nobody@mobi.test', password: owner.password })).status, 401)
  const [{ password }] = await db.query<{ password: string }>('select password from users')
  assert.ok(!password.includes(owner.password))

  const added = await api('/api/users', 'POST', { name: 'Meera', email: 'meera@mobi.test', password: 'manager-pass', role: 'Manager' })
  assert.deepEqual(added.body.users.map((item: any) => item.role), ['Store Owner', 'Manager'])
  assert.equal((await api('/api/users', 'POST', { name: 'Meera', email: 'meera@mobi.test', password: 'manager-pass', role: 'Manager' })).status, 409)
  assert.equal((await api('/api/users', 'POST', { name: 'X', email: 'x@mobi.test', password: 'manager-pass', role: 'Admin' })).status, 400)
  const meera = (await api('/api/auth/login', 'POST', { email: 'meera@mobi.test', password: 'manager-pass' })).body
  assert.equal((await api('/api/auth/password', 'POST', { current: 'wrong', password: 'new-password-1' }, as(meera.token))).status, 400)
  assert.equal((await api('/api/auth/password', 'POST', { current: 'manager-pass', password: 'new-password-1' }, as(meera.token))).status, 200)
  assert.equal((await api('/api/auth/login', 'POST', { email: 'meera@mobi.test', password: 'manager-pass' })).status, 401)

  assert.equal((await api(`/api/users/${(await api('/api/auth/me')).body.user.id}`, 'DELETE')).status, 409)
  assert.equal((await api(`/api/users/${meera.user.id}`, 'DELETE')).body.users.length, 1)
  assert.equal((await api('/api/auth/me', 'GET', undefined, as(meera.token))).status, 401)

  for (let attempt = 0; attempt < 8; attempt++) await api('/api/auth/login', 'POST', { email: 'locked@mobi.test', password: 'guess' })
  assert.equal((await api('/api/auth/login', 'POST', { email: 'locked@mobi.test', password: 'guess' })).status, 429)
})

test('a new store is empty until initialised, and init never overwrites', async () => {
  assert.equal((await api('/api/scopes/mobi:main')).body.initialised, false)
  const first = await api('/api/scopes/mobi:main/init', 'POST', seed)
  assert.deepEqual(first.body.products.map((item: any) => item.id), ['P1', 'P2'])
  const second = await api('/api/scopes/mobi:main/init', 'POST', { ...seed, products: [{ id: 'X' }] })
  assert.deepEqual(second.body.products.map((item: any) => item.id), ['P1', 'P2'])
  assert.deepEqual(second.body.orders, [])
})

test('changes are saved, new records come first, stores are isolated', async () => {
  const change = await api('/api/scopes/mobi:main/changes', 'POST', {
    upserts: { products: [{ id: 'P3', name: 'Charger', stock: 2 }, { id: 'P1', name: 'Phone', stock: 4 }] },
    deletes: { products: ['P2'] },
    meta: { salesToday: { total: 250, orders: 2 }, invoiceSeq: 1002 },
  })
  assert.equal(change.status, 200)
  const state = (await api('/api/scopes/mobi:main')).body
  assert.deepEqual(state.products.map((item: any) => [item.id, item.stock]), [['P3', 2], ['P1', 4]])
  assert.equal(state.invoiceSeq, 1002)
  assert.deepEqual(state.salesToday, { total: 250, orders: 2 })
  assert.equal((await api('/api/scopes/mobi:outlet')).body.initialised, false)
  assert.equal((await api('/api/scopes/mobi:outlet/changes', 'POST', { upserts: { products: [{ id: 'Z' }] } })).status, 404)
})

test('bad input is rejected', async () => {
  assert.equal((await api('/api/scopes/bad scope')).status, 400)
  assert.equal((await api('/api/scopes/mobi:main/changes', 'POST', { upserts: { orders: [{ id: 'O1' }] } })).status, 400)
  assert.equal((await api('/api/scopes/mobi:main/changes', 'POST', { upserts: { products: [{ name: 'no id' }] } })).status, 400)
  assert.equal((await api('/api/nope')).status, 404)
})

test('brands are saved', async () => {
  assert.equal((await api('/api/brands')).body, null)
  assert.equal((await api('/api/brands', 'PUT', { brands: [] })).status, 400)
  await api('/api/brands', 'PUT', { brands: [{ id: 'mobi', name: 'Mobi' }] })
  assert.deepEqual((await api('/api/brands')).body, { brands: [{ id: 'mobi', name: 'Mobi' }] })
})

test('marketplace actions and brand changes are for the Store Owner only', async () => {
  await api('/api/users', 'POST', { name: 'Cash', email: 'cashier@mobi.test', password: 'cashier-pass', role: 'Cashier' })
  const cashier = (await api('/api/auth/login', 'POST', { email: 'cashier@mobi.test', password: 'cashier-pass' })).body.token
  assert.equal((await api('/api/scopes/mobi:main/platforms/amazon/connect', 'POST', { credentials: {} }, as(cashier))).status, 403)
  assert.equal((await api('/api/scopes/mobi:main/platforms/amazon/sync', 'POST', {}, as(cashier))).status, 403)
  assert.equal((await api('/api/brands', 'PUT', { brands: [{ id: 'x' }] }, as(cashier))).status, 403)
  assert.equal((await api('/api/users', 'GET', undefined, as(cashier))).status, 403)
  assert.equal((await api('/api/scopes/mobi:main', 'GET', undefined, as(cashier))).status, 200)
})

test('platforms without a seller API cannot be connected', async () => {
  const result = await api('/api/scopes/mobi:main/platforms/meesho/connect', 'POST', { credentials: {} }, admin)
  assert.equal(result.status, 409)
  assert.equal((await api('/api/scopes/mobi:main/platforms/ebay/connect', 'POST', {}, admin)).status, 404)
})

const amazonCredentials = { sellerId: 'A1SELLER', clientId: 'client', clientSecret: 'top-secret-value', refreshToken: 'Atzr|refresh-value' }

test('rejected credentials are not stored', async () => {
  remote = () => json({ error: 'invalid_grant', error_description: 'The request has an invalid grant parameter' }, 400)
  const result = await api('/api/scopes/mobi:main/platforms/amazon/connect', 'POST', { credentials: amazonCredentials }, admin)
  assert.equal(result.status, 502)
  assert.match(result.body.error, /invalid grant/)
  assert.equal((await api('/api/scopes/mobi:main')).body.platforms.find((item: any) => item.id === 'amazon').connected, false)
  assert.equal((await api('/api/scopes/mobi:main/platforms/amazon/connect', 'POST', { credentials: { sellerId: 'x' } }, admin)).status, 400)
})

test('amazon: connect, encrypted storage, order import', async () => {
  remote = (url, init) => {
    if (url === 'https://api.amazon.com/auth/o2/token') {
      assert.equal(new URLSearchParams(String(init?.body)).get('grant_type'), 'refresh_token')
      return json({ access_token: 'Atza|token' })
    }
    assert.equal(headersOf(init)['x-amz-access-token'], 'Atza|token')
    if (url.includes('/sellers/v1/marketplaceParticipations')) return json({ payload: [] })
    if (url.includes('/orderItems')) return json({ payload: { OrderItems: [{ Title: 'Galaxy S24', SellerSKU: 'SAM-S24', QuantityOrdered: 2, ItemPrice: { Amount: '100000.00' } }] } })
    if (url.includes('/orders/v0/orders?')) {
      assert.equal(new URL(url).searchParams.get('MarketplaceIds'), 'A21TJRUUN4KGV')
      return json({ payload: { Orders: [{ AmazonOrderId: '402-1', PurchaseDate: '2026-11-10T10:00:00Z', OrderStatus: 'Shipped', OrderTotal: { Amount: '100000.00' }, ShippingAddress: { City: 'Pune', StateOrRegion: 'MH', PostalCode: '411001' } }] } })
    }
    return json({}, 404)
  }
  const connected = await api('/api/scopes/mobi:main/platforms/amazon/connect', 'POST', { credentials: amazonCredentials }, admin)
  assert.equal(connected.status, 200)
  const platform = connected.body.platforms.find((item: any) => item.id === 'amazon')
  assert.equal(platform.connected, true)
  assert.equal(platform.sellerId, 'A1SELLER')
  assert.ok(!JSON.stringify(connected.body).includes('top-secret-value'))
  const [row] = await db.query<{ credentials: string }>("select credentials from connections where platform = 'amazon'")
  assert.ok(!row.credentials.includes('top-secret-value') && !row.credentials.includes('refresh-value'))

  const synced = await api('/api/scopes/mobi:main/platforms/amazon/sync', 'POST', {}, admin)
  assert.equal(synced.status, 200)
  assert.deepEqual(synced.body.orders, [
    { id: '402-1', platform: 'amazon', customer: 'Amazon customer', amount: 100000, date: '2026-11-10T10:00:00Z', status: 'Shipped', address: 'Pune, MH, 411001', trackingId: '', courier: 'Seller fulfilled', delivery: '', lines: [{ productId: '', name: 'Galaxy S24', sku: 'SAM-S24', qty: 2, price: 50000 }] },
  ])
  assert.equal(synced.body.syncLogs[0].status, 'Success')
  assert.ok(synced.body.platforms.find((item: any) => item.id === 'amazon').lastSync)
  await api('/api/scopes/mobi:main/platforms/amazon/sync', 'POST', {}, admin)
  assert.equal((await api('/api/scopes/mobi:main')).body.orders.length, 1)
})

test('a failed sync is logged and reported', async () => {
  remote = () => json({ errors: [{ message: 'Access to requested resource is denied.' }] }, 403)
  const result = await api('/api/scopes/mobi:main/platforms/amazon/sync', 'POST', {}, admin)
  assert.equal(result.status, 502)
  assert.match(result.body.error, /denied/)
  assert.equal(result.body.syncLogs[0].status, 'Failed')
  assert.match(result.body.platforms.find((item: any) => item.id === 'amazon').lastError, /denied/)
})

test('flipkart: connect and order import with paging', async () => {
  remote = (url, init) => {
    if (url.includes('/oauth-service/oauth/token')) {
      assert.equal(headersOf(init).authorization, `Basic ${Buffer.from('app:secret').toString('base64')}`)
      return json({ access_token: 'fk-token' })
    }
    assert.equal(headersOf(init).authorization, 'Bearer fk-token')
    if (url.endsWith('/sellers/v3/shipments/filter/')) {
      const { filter } = JSON.parse(String(init?.body))
      if (filter.type !== 'preDispatch') return json({ hasMore: false, shipments: [] })
      return json({ hasMore: true, nextPageUrl: '/v3/shipments/filter?next=2', shipments: [{ shipmentId: 'S1', dispatchByDate: '2026-11-12T00:00:00Z', orderItems: [{ orderId: 'OD1', sku: 'IP15', title: 'iPhone 15', quantity: 1, orderDate: '2026-11-09T00:00:00Z', priceComponents: { sellingPrice: 70000 } }] }] })
    }
    if (url.endsWith('/sellers/v3/shipments/filter?next=2')) return json({ hasMore: false, shipments: [{ shipmentId: 'S2', orderItems: [{ orderId: 'OD2', sku: 'CASE', title: 'Case', quantity: 3, priceComponents: { sellingPrice: 300 } }] }] })
    return json({}, 404)
  }
  const connected = await api('/api/scopes/mobi:main/platforms/flipkart/connect', 'POST', { credentials: { appId: 'app', appSecret: 'secret' } }, admin)
  assert.equal(connected.status, 200)
  const synced = await api('/api/scopes/mobi:main/platforms/flipkart/sync', 'POST', {}, admin)
  assert.equal(synced.status, 200)
  const orders = synced.body.orders.filter((item: any) => item.platform === 'flipkart')
  assert.deepEqual(orders.map((item: any) => [item.id, item.amount, item.status]).sort(), [['OD1', 70000, 'Processing'], ['OD2', 900, 'Processing']])
})

test('amazon: catalogue import links by SKU, adds the rest, then price and stock are sent', async () => {
  const scope = '/api/scopes/mobi:web'
  await api(`${scope}/init`, 'POST', { ...seed, products: [{ id: 'P1', name: 'Galaxy S24', sku: 'sam-s24', price: 79999, stock: 6, reserved: 1, platforms: [] }] })
  const patches: Record<string, any>[] = []
  remote = (url, init) => {
    if (url === 'https://api.amazon.com/auth/o2/token') return json({ access_token: 'Atza|token' })
    if (url.includes('/sellers/v1/marketplaceParticipations')) return json({ payload: [] })
    const { pathname, searchParams } = new URL(url)
    if (init?.method === 'PATCH') {
      const sku = decodeURIComponent(pathname.split('/').pop()!)
      patches.push({ sku, ...JSON.parse(String(init.body)) })
      return sku === 'FBA-1' ? json({ sku, status: 'INVALID', issues: [{ severity: 'ERROR', message: 'Price is below the minimum.' }] }) : json({ sku, status: 'ACCEPTED', issues: [] })
    }
    if (pathname === '/listings/2021-08-01/items/A1SELLER') {
      assert.equal(searchParams.get('marketplaceIds'), 'A21TJRUUN4KGV')
      assert.equal(searchParams.get('includedData'), 'summaries,offers,fulfillmentAvailability')
      if (searchParams.get('pageToken') === 'next') return json({ items: [{ sku: 'FBA-1', summaries: [{ marketplaceId: 'A21TJRUUN4KGV', asin: 'B0FBA', itemName: 'Buds Pro', productType: 'HEADPHONES' }], offers: [{ marketplaceId: 'A21TJRUUN4KGV', offerType: 'B2C', price: { currencyCode: 'INR', amount: '4999.00' } }], fulfillmentAvailability: [{ fulfillmentChannelCode: 'AMAZON_IN', quantity: 40 }] }] })
      return json({ pagination: { nextToken: 'next' }, items: [{ sku: 'SAM-S24', summaries: [{ marketplaceId: 'A21TJRUUN4KGV', asin: 'B0S24', itemName: 'Samsung Galaxy S24 5G', productType: 'CELLULAR_PHONE' }], offers: [{ marketplaceId: 'A21TJRUUN4KGV', offerType: 'B2C', price: { currencyCode: 'INR', amount: '81000.00' } }], fulfillmentAvailability: [{ fulfillmentChannelCode: 'DEFAULT', quantity: 3 }] }] })
    }
    return json({}, 404)
  }
  assert.equal((await api(`${scope}/platforms/amazon/catalogue`, 'POST', {})).status, 409)
  assert.equal((await api(`${scope}/platforms/amazon/connect`, 'POST', { credentials: amazonCredentials })).status, 200)
  assert.equal((await api(`${scope}/platforms/amazon/push`, 'POST', {})).status, 409)

  const imported = await api(`${scope}/platforms/amazon/catalogue`, 'POST', {})
  assert.equal(imported.status, 200)
  const [added, linked] = imported.body.products
  assert.deepEqual([linked.id, linked.name, linked.price, linked.stock, linked.platforms], ['P1', 'Galaxy S24', 79999, 6, ['amazon']])
  assert.deepEqual([linked.links.amazon.asin, linked.links.amazon.price, linked.links.amazon.stock], ['B0S24', 81000, 3])
  assert.deepEqual([added.name, added.sku, added.price, added.stock, added.platforms], ['Buds Pro', 'FBA-1', 4999, 0, ['amazon']])
  assert.match(imported.body.syncLogs[0].message, /2 listings read: 1 added as new products, 1 linked/)
  assert.equal(imported.body.syncLogs[0].event, 'Catalogue Import')
  assert.equal((await api(`${scope}/platforms/amazon/catalogue`, 'POST', {})).body.products.length, 2)

  const pushed = await api(`${scope}/platforms/amazon/push`, 'POST', {})
  assert.equal(pushed.status, 502)
  assert.match(pushed.body.error, /1 of 2 updated. FBA-1: Price is below the minimum/)
  assert.equal(pushed.body.syncLogs[0].status, 'Failed')
  const own = patches.find((patch) => patch.sku === 'SAM-S24')!
  assert.equal(own.productType, 'CELLULAR_PHONE')
  assert.deepEqual(own.patches.map((patch: any) => patch.path), ['/attributes/purchasable_offer', '/attributes/fulfillment_availability'])
  assert.equal(own.patches[0].value[0].our_price[0].schedule[0].value_with_tax, 79999)
  assert.deepEqual(own.patches[1].value, [{ fulfillment_channel_code: 'DEFAULT', quantity: 5 }])
  // Stock held by Amazon is never overwritten.
  assert.deepEqual(patches.find((patch) => patch.sku === 'FBA-1')!.patches.map((patch: any) => patch.path), ['/attributes/purchasable_offer'])
  const after = pushed.body.products.find((item: any) => item.id === 'P1').links.amazon
  assert.deepEqual([after.price, after.stock, Boolean(after.pushedAt)], [79999, 5, true])
  assert.equal(pushed.body.products.find((item: any) => item.sku === 'FBA-1').links.amazon.pushedAt, undefined)

  patches.length = 0
  const one = await api(`${scope}/platforms/amazon/push`, 'POST', { productIds: ['P1'] })
  assert.deepEqual([one.status, patches.length, one.body.syncLogs[0].status, one.body.syncLogs[0].sku], [200, 1, 'Success', 'sam-s24'])

  const cashier = (await api('/api/users', 'POST', { name: 'Cat', email: 'cat@mobi.test', password: 'cashier-pass-9', role: 'Cashier' })).body
  const session = (await api('/api/auth/login', 'POST', { email: 'cat@mobi.test', password: 'cashier-pass-9' }, { authorization: '' })).body.token
  assert.equal((await api(`${scope}/platforms/amazon/catalogue`, 'POST', {}, as(session))).status, 403)
  assert.equal((await api(`${scope}/platforms/amazon/push`, 'POST', {}, as(session))).status, 403)
  await api(`/api/users/${cashier.id ?? cashier.user?.id}`, 'DELETE')
})

test('flipkart: catalogue import in batches of ten, then price and stock are sent', async () => {
  const scope = '/api/scopes/mobi:web'
  const skus = Array.from({ length: 12 }, (_, index) => `FK-${index + 1}`)
  const sent: Record<string, any> = {}
  const detailCalls: string[][] = []
  remote = (url, init) => {
    if (url.includes('/oauth-service/oauth/token')) return json({ access_token: 'fk-token' })
    assert.equal(headersOf(init).authorization, 'Bearer fk-token')
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (url.endsWith('/sellers/v3/shipments/filter/')) return json({ hasMore: false, shipments: [] })
    if (url.endsWith('/sellers/listings/v3/search')) {
      const first = !body.page_id
      return json({ has_more: first, next_page_id: first ? 'p2' : null, listings: (first ? skus.slice(0, 8) : skus.slice(8)).map((sku) => ({ sku_id: sku, product_id: `PID-${sku}`, listing_id: `LST-${sku}` })) })
    }
    if (url.endsWith('/sellers/listings/v3/details')) {
      detailCalls.push(body.sku_ids)
      return json({ available: Object.fromEntries(body.sku_ids.map((sku: string) => [sku, { product_id: `PID-${sku}`, product_title: `Phone ${sku}`, price: { mrp: 20000, selling_price: 15000 }, locations: sku === 'FK-2' ? [] : [{ id: 'LOC1', status: 'ENABLED', inventory: 7 }] }])) })
    }
    if (url.endsWith('/sellers/listings/v3/update/price') || url.endsWith('/sellers/listings/v3/update/inventory')) {
      const kind = url.endsWith('price') ? 'price' : 'inventory'
      for (const [sku, value] of Object.entries(body)) sent[`${kind}:${sku}`] = value
      return json(Object.fromEntries(Object.keys(body).map((sku) => [sku, kind === 'inventory' && sku === 'FK-3' ? { status: 'failure', errors: [{ description: 'Location is disabled.' }] } : { status: 'success' }])))
    }
    return json({}, 404)
  }
  assert.equal((await api(`${scope}/platforms/flipkart/connect`, 'POST', { credentials: { appId: 'app', appSecret: 'secret' } })).status, 200)
  const imported = await api(`${scope}/platforms/flipkart/catalogue`, 'POST', {})
  assert.equal(imported.status, 200)
  assert.deepEqual(detailCalls.map((batch) => batch.length), [10, 2])
  const listed = imported.body.products.filter((item: any) => item.platforms.includes('flipkart'))
  assert.equal(listed.length, 12)
  const first = listed.find((item: any) => item.sku === 'FK-1')
  assert.deepEqual([first.name, first.price, first.stock, first.links.flipkart.productId, first.links.flipkart.locationId], ['Phone FK-1', 15000, 7, 'PID-FK-1', 'LOC1'])

  await api(`${scope}/changes`, 'POST', { upserts: { products: [{ ...first, price: 14500, stock: 4 }] } })
  const pushed = await api(`${scope}/platforms/flipkart/push`, 'POST', {})
  assert.equal(pushed.status, 502)
  assert.match(pushed.body.error, /11 of 12 updated. FK-3: Flipkart stock update failed: Location is disabled/)
  assert.deepEqual(sent['price:FK-1'], { product_id: 'PID-FK-1', price: { mrp: 20000, selling_price: 14500, currency: 'INR' } })
  assert.deepEqual(sent['inventory:FK-1'], { product_id: 'PID-FK-1', locations: [{ id: 'LOC1', inventory: 4 }] })
  // No seller location means Flipkart holds the stock, so only the price is sent.
  assert.ok(sent['price:FK-2'] && !sent['inventory:FK-2'])
})

test('a failed catalogue import changes nothing and is logged', async () => {
  const scope = '/api/scopes/mobi:web'
  const before = (await api(scope)).body.products
  remote = (url) => (url.includes('/oauth-service/oauth/token') ? json({ access_token: 'fk-token' }) : json({ errors: [{ description: 'Seller is on hold.' }] }, 403))
  const result = await api(`${scope}/platforms/flipkart/catalogue`, 'POST', {})
  assert.equal(result.status, 502)
  assert.match(result.body.error, /Seller is on hold/)
  assert.equal(result.body.syncLogs[0].status, 'Failed')
  assert.deepEqual(result.body.products, before)
})

test('disconnect removes the stored credentials', async () => {
  const result = await api('/api/scopes/mobi:main/platforms/amazon/disconnect', 'POST', {}, admin)
  assert.equal(result.body.platforms.find((item: any) => item.id === 'amazon').connected, false)
  const [row] = await db.query<{ credentials: string | null }>("select credentials from connections where platform = 'amazon' and scope = 'mobi:main'")
  assert.equal(row.credentials, null)
  assert.equal((await api('/api/scopes/mobi:main/platforms/amazon/sync', 'POST', {}, admin)).status, 409)
})

test('data survives a restart', async () => {
  await stop()
  await start()
  const state = (await api('/api/scopes/mobi:main')).body
  assert.deepEqual(state.products.map((item: any) => item.id), ['P3', 'P1'])
  assert.equal(state.orders.length, 3)
  assert.equal(state.platforms.find((item: any) => item.id === 'flipkart').connected, true)
})

test('only the marketplaces are ever called', () => {
  assert.ok(calls.length > 0 && calls.every((url) => url.startsWith('https://api.amazon.com/') || url.startsWith('https://sellingpartnerapi-eu.amazon.com/') || url.startsWith('https://api.flipkart.net/')))
})
