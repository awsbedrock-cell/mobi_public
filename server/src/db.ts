import { mkdirSync } from 'node:fs'

type Row = Record<string, unknown>
export interface Queryable {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>
}
export interface Database extends Queryable {
  tx<T>(run: (db: Queryable) => Promise<T>): Promise<T>
  close(): Promise<void>
}

const schema = `
create table if not exists scopes (scope text primary key, meta jsonb not null);
create table if not exists records (
  scope text not null, kind text not null, id text not null, rank double precision not null, data jsonb not null,
  primary key (scope, kind, id));
create table if not exists settings (key text primary key, data jsonb not null);
create table if not exists users (
  id text primary key,
  email text not null unique,
  name text not null,
  role text not null,
  password text not null,
  created_at timestamptz not null default now()
);
create table if not exists connections (
  scope text not null, platform text not null, credentials text, seller_id text,
  connected boolean not null default false, last_sync timestamptz, last_error text,
  primary key (scope, platform));
`

/** PostgreSQL when DATABASE_URL is set, otherwise an embedded Postgres (PGlite) on disk. Both run the same SQL. */
export async function openDatabase(url = process.env.DATABASE_URL, dataDir = process.env.DATA_DIR ?? './data'): Promise<Database> {
  let db: Database
  if (url) {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false } })
    db = {
      query: async (sql, params) => (await pool.query(sql, params)).rows,
      tx: async (run) => {
        const client = await pool.connect()
        try {
          await client.query('begin')
          const result = await run({ query: async (sql, params) => (await client.query(sql, params)).rows })
          await client.query('commit')
          return result
        } catch (error) {
          await client.query('rollback')
          throw error
        } finally {
          client.release()
        }
      },
      close: () => pool.end(),
    }
  } else {
    const { PGlite } = await import('@electric-sql/pglite')
    if (dataDir !== 'memory://') mkdirSync(dataDir, { recursive: true })
    const lite = await PGlite.create(dataDir)
    db = {
      query: async (sql, params) => (await lite.query(sql, params)).rows as never,
      tx: (run) => lite.transaction((tx) => run({ query: async (sql, params) => (await tx.query(sql, params)).rows as never })),
      close: () => lite.close(),
    }
  }
  for (const statement of schema.split(';').map((part) => part.trim()).filter(Boolean)) await db.query(statement)
  return db
}
