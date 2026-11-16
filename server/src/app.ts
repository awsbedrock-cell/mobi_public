import { createHash, timingSafeEqual } from 'node:crypto'
import express, { type NextFunction, type Request, type Response } from 'express'
import type { Vault } from './crypto.ts'
import type { Database, Queryable } from './db.ts'
import { getMarketplace, marketplaces } from './marketplaces/index.ts'
import { MarketplaceError, type Credentials, type Fetch, type Marketplace } from './marketplaces/types.ts'

const KINDS = ['products', 'customers', 'expenses', 'orders', 'syncLogs'] as const
type Kind = (typeof KINDS)[number]
type Item = { id: string } & Record<string, unknown>

export interface AppOptions {
  db: Database
  vault: Vault
  /** Required in the x-admin-key header to connect, disconnect or sync a marketplace. */
  adminKey?: string
  corsOrigins?: string[]
  fetcher?: Fetch
  /** How far back the first order import looks. */
  syncDays?: number
}

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const sameSecret = (a: string, b: string) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())

const isItem = (value: unknown): value is Item => typeof value === 'object' && value !== null && typeof (value as Item).id === 'string' && (value as Item).id.length > 0 && (value as Item).id.length <= 200

function itemsOf(value: unknown, what: string): Item[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || !value.every(isItem)) throw new HttpError(400, `${what} must be a list of records with an id`)
  return value
}

async function upsert(db: Queryable, scope: string, kind: Kind, items: Item[], rankOf?: (item: Item, index: number) => number) {
  if (items.length === 0) return
  const [{ low }] = await db.query<{ low: number | null }>('select min(rank) as low from records where scope = $1 and kind = $2', [scope, kind])
  let next = (low ?? 0) - items.length
  for (const [index, item] of items.entries()) {
    await db.query(
      `insert into records (scope, kind, id, rank, data) values ($1, $2, $3, $4, $5)
       on conflict (scope, kind, id) do update set data = excluded.data`,
      [scope, kind, item.id, rankOf ? rankOf(item, index) : next++, JSON.stringify(item)],
    )
  }
}

export function createApp({ db, vault, adminKey, corsOrigins = [], fetcher = fetch, syncDays = 30 }: AppOptions) {
  const app = express()
  app.disable('x-powered-by')

  app.use((req, res, next) => {
    const origin = req.headers.origin
    if (origin && (corsOrigins.length === 0 || corsOrigins.includes(origin))) {
      res.setHeader('access-control-allow-origin', origin)
      res.setHeader('vary', 'Origin')
      res.setHeader('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS')
      res.setHeader('access-control-allow-headers', 'content-type,x-admin-key')
    }
    if (req.method === 'OPTIONS') return void res.sendStatus(204)
    next()
  })
  app.use(express.json({ limit: '8mb' }))

  const scopeOf = (req: Request) => {
    const scope = String(req.params.scope)
    if (!/^[\w-]{1,80}:[\w-]{1,80}$/.test(scope)) throw new HttpError(400, 'Invalid store scope')
    return scope
  }

  const requireAdmin = (req: Request) => {
    if (!adminKey) throw new HttpError(503, 'Marketplace connections are disabled: ADMIN_KEY is not set on the server')
    if (!vault.ready) throw new HttpError(503, 'Marketplace connections are disabled: CREDENTIALS_KEY is not set on the server')
    const given = req.headers['x-admin-key']
    if (typeof given !== 'string' || !sameSecret(given, adminKey)) throw new HttpError(401, 'Wrong admin key')
  }

  const marketplaceOf = (req: Request): Marketplace => {
    const marketplace = getMarketplace(String(req.params.platform))
    if (!marketplace) throw new HttpError(404, 'Unknown marketplace')
    return marketplace
  }

  async function platformState(scope: string) {
    const rows = await db.query<{ platform: string; seller_id: string | null; connected: boolean; last_sync: Date | string | null; last_error: string | null }>(
      'select platform, seller_id, connected, last_sync, last_error from connections where scope = $1',
      [scope],
    )
    return marketplaces.map((marketplace) => {
      const row = rows.find((item) => item.platform === marketplace.id)
      return {
        id: marketplace.id,
        available: marketplace.available,
        note: marketplace.note,
        docsUrl: marketplace.docsUrl,
        fields: marketplace.fields,
        connected: Boolean(row?.connected),
        sellerId: row?.seller_id ?? '',
        lastSync: row?.last_sync ? new Date(row.last_sync).toISOString() : '',
        lastError: row?.last_error ?? '',
      }
    })
  }

  async function scopeState(scope: string) {
    const [meta] = await db.query<{ meta: Record<string, unknown> }>('select meta from scopes where scope = $1', [scope])
    const platforms = await platformState(scope)
    if (!meta) return { initialised: false, platforms }
    const rows = await db.query<{ kind: Kind; data: Item }>('select kind, data from records where scope = $1 order by rank, id', [scope])
    const lists = Object.fromEntries(KINDS.map((kind) => [kind, rows.filter((row) => row.kind === kind).map((row) => row.data)]))
    return { initialised: true, ...lists, ...meta.meta, platforms }
  }

  const metaOf = (body: Record<string, unknown>) => {
    const sales = body.salesToday as { total?: unknown; orders?: unknown } | undefined
    if (!sales || typeof sales.total !== 'number' || typeof sales.orders !== 'number' || typeof body.invoiceSeq !== 'number') throw new HttpError(400, 'salesToday and invoiceSeq are required')
    return { salesToday: { total: sales.total, orders: sales.orders }, invoiceSeq: body.invoiceSeq }
  }

  app.get('/api/health', async (_req, res) => {
    await db.query('select 1')
    res.json({ ok: true, marketplaceConnections: Boolean(adminKey && vault.ready) })
  })

  app.get('/api/marketplaces', (_req, res) => {
    res.json(marketplaces.map(({ id, name, available, note, docsUrl, fields }) => ({ id, name, available, note, docsUrl, fields })))
  })

  app.get('/api/brands', async (_req, res) => {
    const [row] = await db.query<{ data: unknown }>("select data from settings where key = 'brands'")
    res.json(row?.data ?? null)
  })

  app.put('/api/brands', async (req, res) => {
    const body = req.body as { brands?: unknown }
    if (!Array.isArray(body?.brands) || body.brands.length === 0 || !body.brands.every(isItem)) throw new HttpError(400, 'brands must be a non-empty list')
    await db.query("insert into settings (key, data) values ('brands', $1) on conflict (key) do update set data = excluded.data", [JSON.stringify({ brands: body.brands })])
    res.json({ ok: true })
  })

  app.get('/api/scopes/:scope', async (req, res) => {
    res.json(await scopeState(scopeOf(req)))
  })

  /** First-time setup of a store with starter data. Does nothing if the store already has data. */
  app.post('/api/scopes/:scope/init', async (req, res) => {
    const scope = scopeOf(req)
    const body = (req.body ?? {}) as Record<string, unknown>
    const meta = metaOf(body)
    const lists = { products: itemsOf(body.products, 'products'), customers: itemsOf(body.customers, 'customers'), expenses: itemsOf(body.expenses, 'expenses') }
    await db.tx(async (tx) => {
      const created = await tx.query('insert into scopes (scope, meta) values ($1, $2) on conflict (scope) do nothing returning scope', [scope, JSON.stringify(meta)])
      if (created.length === 0) return
      for (const [kind, items] of Object.entries(lists)) await upsert(tx, scope, kind as Kind, items, (_item, index) => index)
    })
    res.json(await scopeState(scope))
  })

  app.post('/api/scopes/:scope/changes', async (req, res) => {
    const scope = scopeOf(req)
    const body = (req.body ?? {}) as { upserts?: Record<string, unknown>; deletes?: Record<string, unknown>; meta?: Record<string, unknown> }
    const editable: Kind[] = ['products', 'customers', 'expenses']
    for (const key of [...Object.keys(body.upserts ?? {}), ...Object.keys(body.deletes ?? {})]) if (!editable.includes(key as Kind)) throw new HttpError(400, `Unknown collection: ${key}`)
    const meta = body.meta ? metaOf(body.meta) : null
    await db.tx(async (tx) => {
      const [exists] = await tx.query('select 1 from scopes where scope = $1', [scope])
      if (!exists) throw new HttpError(404, 'Store has not been set up')
      for (const kind of editable) {
        const ids = body.deletes?.[kind]
        if (ids !== undefined && (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string'))) throw new HttpError(400, 'deletes must be lists of ids')
        for (const id of (ids as string[] | undefined) ?? []) await tx.query('delete from records where scope = $1 and kind = $2 and id = $3', [scope, kind, id])
        await upsert(tx, scope, kind, itemsOf(body.upserts?.[kind], kind))
      }
      if (meta) await tx.query('update scopes set meta = $2 where scope = $1', [scope, JSON.stringify(meta)])
    })
    res.json({ ok: true })
  })

  app.post('/api/scopes/:scope/platforms/:platform/connect', async (req, res) => {
    requireAdmin(req)
    const scope = scopeOf(req)
    const marketplace = marketplaceOf(req)
    if (!marketplace.available || !marketplace.verify) throw new HttpError(409, marketplace.note)
    const given = ((req.body as { credentials?: Record<string, unknown> })?.credentials ?? {}) as Record<string, unknown>
    const credentials: Credentials = {}
    for (const field of marketplace.fields) {
      const value = given[field.key]
      if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${field.label} is required`)
      credentials[field.key] = value.trim()
    }
    const sellerId = await marketplace.verify(credentials, fetcher)
    await db.query(
      `insert into connections (scope, platform, credentials, seller_id, connected, last_error) values ($1, $2, $3, $4, true, null)
       on conflict (scope, platform) do update set credentials = excluded.credentials, seller_id = excluded.seller_id, connected = true, last_error = null`,
      [scope, marketplace.id, vault.seal(credentials), sellerId],
    )
    res.json(await scopeState(scope))
  })

  app.post('/api/scopes/:scope/platforms/:platform/disconnect', async (req, res) => {
    requireAdmin(req)
    const scope = scopeOf(req)
    await db.query('update connections set connected = false, credentials = null where scope = $1 and platform = $2', [scope, marketplaceOf(req).id])
    res.json(await scopeState(scope))
  })

  /** Imports orders from the marketplace's seller API and records the result in the sync log. */
  app.post('/api/scopes/:scope/platforms/:platform/sync', async (req, res) => {
    requireAdmin(req)
    const scope = scopeOf(req)
    const marketplace = marketplaceOf(req)
    const [row] = await db.query<{ credentials: string | null; connected: boolean; last_sync: Date | string | null }>('select credentials, connected, last_sync from connections where scope = $1 and platform = $2', [scope, marketplace.id])
    if (!row?.connected || !row.credentials || !marketplace.fetchOrders) throw new HttpError(409, `${marketplace.name} is not connected`)
    const now = new Date()
    const since = new Date(now.getTime() - syncDays * 86_400_000)
    const log = (status: 'Success' | 'Failed', message: string): Item => ({ id: `LOG-${now.getTime()}-${marketplace.id}`, platform: marketplace.id, event: 'Order Import', sku: 'All orders', time: now.toISOString(), status, message })
    let error: MarketplaceError | null = null
    try {
      const orders = await marketplace.fetchOrders(vault.open<Credentials>(row.credentials), since, fetcher)
      await db.tx(async (tx) => {
        await upsert(tx, scope, 'orders', orders as unknown as Item[], (order) => -(Date.parse(String(order.date)) || 0))
        await upsert(tx, scope, 'syncLogs', [log('Success', `${orders.length} order${orders.length === 1 ? '' : 's'} imported from the last ${syncDays} days.`)], () => -now.getTime())
        await tx.query('update connections set last_sync = $3, last_error = null where scope = $1 and platform = $2', [scope, marketplace.id, now.toISOString()])
      })
    } catch (cause) {
      if (!(cause instanceof MarketplaceError)) throw cause
      error = cause
      await upsert(db, scope, 'syncLogs', [log('Failed', cause.message)], () => -now.getTime())
      await db.query('update connections set last_error = $3 where scope = $1 and platform = $2', [scope, marketplace.id, cause.message])
    }
    res.status(error ? 502 : 200).json({ ...(await scopeState(scope)), error: error?.message })
  })

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')))

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) return void res.status(error.status).json({ error: error.message })
    if (error instanceof MarketplaceError) return void res.status(502).json({ error: error.message })
    const status = (error as { status?: number }).status
    if (status === 400 || status === 413) return void res.status(status).json({ error: status === 413 ? 'Request is too large' : 'Invalid JSON' })
    console.error(error)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
