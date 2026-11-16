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

test('disconnect removes the stored credentials', async () => {
  const result = await api('/api/scopes/mobi:main/platforms/amazon/disconnect', 'POST', {}, admin)
  assert.equal(result.body.platforms.find((item: any) => item.id === 'amazon').connected, false)
  const [row] = await db.query<{ credentials: string | null }>("select credentials from connections where platform = 'amazon'")
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
