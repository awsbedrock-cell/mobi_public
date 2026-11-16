import { createHash, timingSafeEqual } from 'node:crypto'
import express, { type NextFunction, type Request, type Response } from 'express'
import { accountProblem, checkPassword, createLimiter, createSessions, hashPassword, normaliseEmail, users, type Role, type Sessions, type User } from './auth.ts'
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
  /** Required in the x-admin-key header to create the first Store Owner account. */
  adminKey?: string
  sessions?: Sessions
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

export function createApp({ db, vault, adminKey, sessions = createSessions(), corsOrigins = [], fetcher = fetch, syncDays = 30 }: AppOptions) {
  const app = express()
  app.set('trust proxy', 1)
  const limiter = createLimiter()
  app.disable('x-powered-by')

  app.use((req, res, next) => {
    const origin = req.headers.origin
    if (origin && (corsOrigins.length === 0 || corsOrigins.includes(origin))) {
      res.setHeader('access-control-allow-origin', origin)
      res.setHeader('vary', 'Origin')
      res.setHeader('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS')
      res.setHeader('access-control-allow-headers', 'content-type,authorization,x-admin-key')
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

  const userOf = (res: Response) => res.locals.user as User
  const requireRole = (res: Response, ...allowed: Role[]) => {
    if (!allowed.includes(userOf(res).role)) throw new HttpError(403, `Only a ${allowed.join(' or ')} can do this`)
  }
  /** Marketplace connections are managed by the Store Owner and need the credential vault. */
  const requireAdmin = (_req: Request, res: Response) => {
    if (!vault.ready) throw new HttpError(503, 'Marketplace connections are disabled: CREDENTIALS_KEY is not set on the server')
    requireRole(res, 'Store Owner')
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
    res.json({ ok: true, marketplaceConnections: vault.ready })
  })

  app.get('/api/auth/status', async (_req, res) => {
    res.json({ setupRequired: (await users.count(db)) === 0, setupAvailable: Boolean(adminKey) })
  })

  /** Creates the first Store Owner. Only works while there are no accounts, and needs the server's ADMIN_KEY. */
  app.post('/api/auth/setup', async (req, res) => {
    if (!adminKey) throw new HttpError(503, 'ADMIN_KEY is not set on the server')
    const given = req.headers['x-admin-key']
    const key = `setup|${req.ip}`
    if (limiter.blocked(key)) throw new HttpError(429, 'Too many attempts. Try again in 15 minutes.')
    if (typeof given !== 'string' || !sameSecret(given, adminKey)) {
      limiter.fail(key)
      throw new HttpError(401, 'Wrong admin key')
    }
    const body = (req.body ?? {}) as Record<string, unknown>
    const input = { email: normaliseEmail(body.email), name: body.name, password: body.password, role: 'Store Owner' as Role }
    const problem = accountProblem(input)
    if (problem) throw new HttpError(400, problem)
    const user = await db.tx(async (tx) => {
      if ((await users.count(tx)) > 0) throw new HttpError(409, 'An owner account already exists. Sign in instead.')
      return users.create(tx, input as { email: string; name: string; role: Role; password: string })
    })
    res.json({ token: sessions.issue(user.id), user })
  })

  app.post('/api/auth/login', async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const email = normaliseEmail(body.email)
    const key = `${email}|${req.ip}`
    if (limiter.blocked(key)) throw new HttpError(429, 'Too many wrong passwords. Try again in 15 minutes.')
    const row = email ? await users.withPassword(db, email) : null
    if (!row || typeof body.password !== 'string' || !(await checkPassword(body.password, row.password))) {
      limiter.fail(key)
      throw new HttpError(401, 'Wrong email or password')
    }
    limiter.clear(key)
    const { password: _password, ...user } = row
    res.json({ token: sessions.issue(user.id), user })
  })

  // Everything below needs a signed-in account.
  app.use('/api', async (req, res, next) => {
    const header = req.headers.authorization ?? ''
    const id = header.startsWith('Bearer ') ? sessions.userId(header.slice(7)) : null
    const user = id ? await users.byId(db, id) : null
    if (!user) throw new HttpError(401, 'Sign in to continue')
    res.locals.user = user
    next()
  })

  app.get('/api/auth/me', (_req, res) => {
    res.json({ user: userOf(res) })
  })

  app.post('/api/auth/password', async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const row = await users.withPassword(db, userOf(res).email)
    if (!row || typeof body.current !== 'string' || !(await checkPassword(body.current, row.password))) throw new HttpError(400, 'Current password is wrong')
    const problem = accountProblem({ email: row.email, name: row.name, role: row.role, password: body.password })
    if (problem) throw new HttpError(400, problem)
    await db.query('update users set password = $2 where id = $1', [row.id, await hashPassword(body.password as string)])
    res.json({ ok: true })
  })

  app.get('/api/users', async (_req, res) => {
    requireRole(res, 'Store Owner')
    res.json({ users: await users.list(db) })
  })

  app.post('/api/users', async (req, res) => {
    requireRole(res, 'Store Owner')
    const body = (req.body ?? {}) as Record<string, unknown>
    const input = { email: normaliseEmail(body.email), name: body.name, password: body.password, role: body.role }
    const problem = accountProblem(input)
    if (problem) throw new HttpError(400, problem)
    if (await users.withPassword(db, input.email)) throw new HttpError(409, 'An account with this email already exists')
    await users.create(db, input as { email: string; name: string; role: Role; password: string })
    res.json({ users: await users.list(db) })
  })

  app.delete('/api/users/:id', async (req, res) => {
    requireRole(res, 'Store Owner')
    if (req.params.id === userOf(res).id) throw new HttpError(409, 'You cannot delete your own account')
    await db.query('delete from users where id = $1', [String(req.params.id)])
    res.json({ users: await users.list(db) })
  })

  app.get('/api/marketplaces', (_req, res) => {
    res.json(marketplaces.map(({ id, name, available, note, docsUrl, fields }) => ({ id, name, available, note, docsUrl, fields })))
  })

  app.get('/api/brands', async (_req, res) => {
    const [row] = await db.query<{ data: unknown }>("select data from settings where key = 'brands'")
    res.json(row?.data ?? null)
  })

  app.put('/api/brands', async (req, res) => {
    requireRole(res, 'Store Owner')
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
    requireAdmin(req, res)
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
    requireAdmin(req, res)
    const scope = scopeOf(req)
    await db.query('update connections set connected = false, credentials = null where scope = $1 and platform = $2', [scope, marketplaceOf(req).id])
    res.json(await scopeState(scope))
  })

  /** Imports orders from the marketplace's seller API and records the result in the sync log. */
  app.post('/api/scopes/:scope/platforms/:platform/sync', async (req, res) => {
    requireAdmin(req, res)
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

  /** Loads the saved credentials of a connected marketplace, or refuses. */
  const connectionOf = async (scope: string, marketplace: Marketplace) => {
    const [row] = await db.query<{ credentials: string | null; connected: boolean }>('select credentials, connected from connections where scope = $1 and platform = $2', [scope, marketplace.id])
    if (!row?.connected || !row.credentials) throw new HttpError(409, `${marketplace.name} is not connected`)
    return vault.open<Credentials>(row.credentials)
  }

  /** Runs a marketplace job, records the outcome in the sync log and answers with the refreshed store. */
  const runJob = async (res: Response, scope: string, marketplace: Marketplace, event: string, subject: string, job: (now: Date) => Promise<{ message: string; failed?: boolean }>) => {
    const now = new Date()
    const log = (status: 'Success' | 'Failed', message: string): Item => ({ id: `LOG-${now.getTime()}-${marketplace.id}`, platform: marketplace.id, event, sku: subject, time: now.toISOString(), status, message })
    let error: string | undefined
    try {
      const outcome = await job(now)
      if (outcome.failed) error = outcome.message
      await upsert(db, scope, 'syncLogs', [log(outcome.failed ? 'Failed' : 'Success', outcome.message)], () => -now.getTime())
      await db.query('update connections set last_sync = $3, last_error = $4 where scope = $1 and platform = $2', [scope, marketplace.id, now.toISOString(), error ?? null])
    } catch (cause) {
      if (!(cause instanceof MarketplaceError)) throw cause
      error = cause.message
      await upsert(db, scope, 'syncLogs', [log('Failed', cause.message)], () => -now.getTime())
      await db.query('update connections set last_error = $3 where scope = $1 and platform = $2', [scope, marketplace.id, cause.message])
    }
    res.status(error ? 502 : 200).json({ ...(await scopeState(scope)), error })
  }

  const skuKey = (value: unknown) => String(value ?? '').trim().toLowerCase()
  const productsOf = async (scope: string) => (await db.query<{ data: Item }>("select data from records where scope = $1 and kind = 'products' order by rank, id", [scope])).map((row) => row.data)

  /**
   * Imports the seller's own listings. A listing whose SKU matches a Mobi product is linked to it and Mobi's
   * price and stock are kept; any other listing becomes a new product with the marketplace's price and stock.
   */
  app.post('/api/scopes/:scope/platforms/:platform/catalogue', async (req, res) => {
    requireAdmin(req, res)
    const scope = scopeOf(req)
    const marketplace = marketplaceOf(req)
    const credentials = await connectionOf(scope, marketplace)
    if (!marketplace.fetchListings) throw new HttpError(409, `${marketplace.name} catalogue import is not supported`)
    await runJob(res, scope, marketplace, 'Catalogue Import', 'All listings', async (now) => {
      const listings = (await marketplace.fetchListings!(credentials, fetcher)).filter((listing) => skuKey(listing.sku))
      const bySku = new Map((await productsOf(scope)).map((product) => [skuKey(product.sku), product]))
      const linked: Item[] = []
      const added: Item[] = []
      for (const listing of listings) {
        // The marketplace's own spelling of the SKU is kept: it is what later updates must address.
        const link = { ...listing.ref, sku: listing.sku, price: listing.price, stock: listing.stock, importedAt: now.toISOString() }
        const existing = bySku.get(skuKey(listing.sku))
        if (existing) {
          const platforms = Array.isArray(existing.platforms) ? (existing.platforms as string[]) : []
          const updated = { ...existing, platforms: platforms.includes(marketplace.id) ? platforms : [...platforms, marketplace.id], links: { ...(existing.links as object), [marketplace.id]: link } }
          bySku.set(skuKey(listing.sku), updated)
          if (!added.includes(existing)) linked.push(updated)
          else added[added.indexOf(existing)] = updated
        } else {
          const product: Item = {
            id: `MP-${createHash('sha256').update(`${marketplace.id}:${skuKey(listing.sku)}`).digest('hex').slice(0, 12)}`,
            name: listing.name.slice(0, 200),
            sku: listing.sku.trim(),
            barcode: '',
            category: 'Accessories',
            brand: '',
            price: listing.price,
            cost: 0,
            stock: listing.stock,
            reserved: 0,
            reorderLevel: 0,
            description: `Imported from ${marketplace.name}.`,
            platforms: [marketplace.id],
            links: { [marketplace.id]: link },
          }
          bySku.set(skuKey(listing.sku), product)
          added.push(product)
        }
      }
      await db.tx(async (tx) => {
        // Linked products keep their place in the list; new ones go to the top.
        for (const product of linked) await tx.query("update records set data = $3 where scope = $1 and kind = 'products' and id = $2", [scope, product.id, JSON.stringify(product)])
        await upsert(tx, scope, 'products', added)
      })
      return { message: `${listings.length} listing${listings.length === 1 ? '' : 's'} read: ${added.length} added as new products, ${linked.length} linked to existing products by SKU.` }
    })
  })

  /** Sends Mobi's current price and stock to the marketplace for products linked by a catalogue import. */
  app.post('/api/scopes/:scope/platforms/:platform/push', async (req, res) => {
    requireAdmin(req, res)
    const scope = scopeOf(req)
    const marketplace = marketplaceOf(req)
    const credentials = await connectionOf(scope, marketplace)
    if (!marketplace.pushListings) throw new HttpError(409, `${marketplace.name} price and stock updates are not supported`)
    const only = (req.body as { productIds?: unknown } | undefined)?.productIds
    if (only !== undefined && (!Array.isArray(only) || !only.every((id) => typeof id === 'string'))) throw new HttpError(400, 'productIds must be a list of product ids')
    const linked = (await productsOf(scope)).filter((product) => (product.links as Record<string, unknown> | undefined)?.[marketplace.id] && Array.isArray(product.platforms) && product.platforms.includes(marketplace.id) && (!only || only.includes(product.id)))
    if (linked.length === 0) throw new HttpError(409, `No products are linked to ${marketplace.name} yet. Import the catalogue first.`)
    await runJob(res, scope, marketplace, 'Price & Stock Update', linked.length === 1 ? String(linked[0].sku) : `${linked.length} products`, async (now) => {
      const updates = linked.map((product) => {
        const { sku, price: _price, stock: _stock, importedAt: _importedAt, pushedAt: _pushedAt, ...ref } = (product.links as Record<string, Record<string, unknown>>)[marketplace.id]
        return { sku: String(sku ?? product.sku), price: Number(product.price) || 0, stock: Math.max(0, Math.floor((Number(product.stock) || 0) - (Number(product.reserved) || 0))), ref: ref as Record<string, string> }
      })
      const results = await marketplace.pushListings!(credentials, updates, fetcher)
      const failed = results.filter((result) => result.error)
      const done = new Set(results.filter((result) => !result.error).map((result) => skuKey(result.sku)))
      await db.tx(async (tx) => {
        for (const [index, product] of linked.entries()) {
          if (!done.has(skuKey(updates[index].sku))) continue
          const links = product.links as Record<string, Record<string, unknown>>
          const updated = { ...product, links: { ...links, [marketplace.id]: { ...links[marketplace.id], price: updates[index].price, stock: updates[index].stock, pushedAt: now.toISOString() } } }
          await tx.query("update records set data = $3 where scope = $1 and kind = 'products' and id = $2", [scope, product.id, JSON.stringify(updated)])
        }
      })
      if (failed.length === 0) return { message: `Price and stock sent for ${done.size} product${done.size === 1 ? '' : 's'}.` }
      return { failed: true, message: `${done.size} of ${results.length} updated. ${failed.slice(0, 3).map((result) => `${result.sku}: ${result.error}`).join(' | ')}${failed.length > 3 ? ` | and ${failed.length - 3} more` : ''}` }
    })
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
