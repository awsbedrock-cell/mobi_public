import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'
import type { Queryable } from './db.ts'

export const ROLES = ['Store Owner', 'Manager', 'Cashier'] as const
export type Role = (typeof ROLES)[number]
export interface User {
  id: string
  email: string
  name: string
  role: Role
}

const SESSION_MS = 7 * 86_400_000

const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, (error, key) => (error ? reject(error) : resolve(key))))

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  return `${salt.toString('base64url')}.${(await derive(password, salt)).toString('base64url')}`
}

export async function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split('.')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'base64url')
  const actual = await derive(password, Buffer.from(salt, 'base64url'))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

/** Signed, expiring session tokens. The user is re-read from the database on every request. */
export function createSessions(secret: string = randomBytes(32).toString('hex')) {
  const sign = (payload: string) => createHmac('sha256', secret).update(payload).digest('base64url')
  return {
    issue(userId: string, now = Date.now()) {
      const payload = Buffer.from(JSON.stringify({ uid: userId, exp: now + SESSION_MS })).toString('base64url')
      return `${payload}.${sign(payload)}`
    },
    userId(token: string, now = Date.now()): string | null {
      const [payload, signature] = token.split('.')
      if (!payload || !signature) return null
      const expected = Buffer.from(sign(payload))
      const given = Buffer.from(signature)
      if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
      try {
        const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { uid?: unknown; exp?: unknown }
        return typeof uid === 'string' && typeof exp === 'number' && exp > now ? uid : null
      } catch {
        return null
      }
    },
  }
}
export type Sessions = ReturnType<typeof createSessions>

type Row = User & { password: string }

export const normaliseEmail = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '')

/** Returns a message describing what is wrong with the account details, or null. */
export function accountProblem(input: { email: string; name: unknown; password: unknown; role: unknown }): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 200) return 'Enter a valid email address'
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 100) return 'Name is required'
  if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 200) return 'Password must be at least 8 characters'
  if (!ROLES.includes(input.role as Role)) return 'Unknown role'
  return null
}

export const users = {
  async count(db: Queryable) {
    const [row] = await db.query<{ total: number | string }>('select count(*) as total from users')
    return Number(row.total)
  },
  async byId(db: Queryable, id: string): Promise<User | null> {
    const [row] = await db.query<User>('select id, email, name, role from users where id = $1', [id])
    return row ?? null
  },
  async withPassword(db: Queryable, email: string): Promise<Row | null> {
    const [row] = await db.query<Row>('select id, email, name, role, password from users where email = $1', [email])
    return row ?? null
  },
  list: (db: Queryable) => db.query<User>('select id, email, name, role from users order by created_at, email'),
  async create(db: Queryable, input: { email: string; name: string; role: Role; password: string }): Promise<User> {
    const user: User = { id: randomUUID(), email: input.email, name: input.name.trim(), role: input.role }
    await db.query('insert into users (id, email, name, role, password) values ($1, $2, $3, $4, $5)', [user.id, user.email, user.name, user.role, await hashPassword(input.password)])
    return user
  },
}

/** Blocks repeated wrong passwords for one account from one address. */
export function createLimiter(max = 8, windowMs = 15 * 60_000) {
  const failures = new Map<string, { count: number; until: number }>()
  return {
    blocked(key: string, now = Date.now()) {
      const entry = failures.get(key)
      if (entry && entry.until <= now) failures.delete(key)
      return (failures.get(key)?.count ?? 0) >= max
    },
    fail(key: string, now = Date.now()) {
      const entry = failures.get(key)
      if (!entry || entry.until <= now) failures.set(key, { count: 1, until: now + windowMs })
      else entry.count++
      if (failures.size > 10_000) for (const [name, item] of failures) if (item.until <= now) failures.delete(name)
    },
    clear: (key: string) => void failures.delete(key),
  }
}
