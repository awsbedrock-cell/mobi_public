import { createHmac } from 'node:crypto'
import { createApp } from './app.ts'
import { createSessions } from './auth.ts'
import { createVault } from './crypto.ts'
import { openDatabase } from './db.ts'

const db = await openDatabase()
const vault = createVault()
const adminKey = process.env.ADMIN_KEY || undefined
const corsOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map((item) => item.trim().replace(/\/+$/, '')).filter(Boolean)
// Sessions survive restarts when a secret is configured; otherwise everyone signs in again after a restart.
const sessionSecret = process.env.SESSION_SECRET || (process.env.CREDENTIALS_KEY ? createHmac('sha256', process.env.CREDENTIALS_KEY).update('mobi-sessions').digest('hex') : undefined)
const port = Number(process.env.PORT) || 4000

createApp({ db, vault, adminKey, corsOrigins, sessions: createSessions(sessionSecret) }).listen(port, () => {
  console.log(`Mobi API listening on :${port} (${process.env.DATABASE_URL ? 'PostgreSQL' : 'embedded database'})`)
  if (!adminKey) console.warn('ADMIN_KEY is not set: the first Store Owner account cannot be created.')
  if (!vault.ready) console.warn('CREDENTIALS_KEY is not set: marketplaces cannot be connected.')
})
