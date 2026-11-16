import { createApp } from './app.ts'
import { createVault } from './crypto.ts'
import { openDatabase } from './db.ts'

const db = await openDatabase()
const vault = createVault()
const adminKey = process.env.ADMIN_KEY || undefined
const corsOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map((item) => item.trim().replace(/\/+$/, '')).filter(Boolean)
const port = Number(process.env.PORT) || 4000

createApp({ db, vault, adminKey, corsOrigins }).listen(port, () => {
  console.log(`Mobi API listening on :${port} (${process.env.DATABASE_URL ? 'PostgreSQL' : 'embedded database'})`)
  if (!adminKey || !vault.ready) console.warn('ADMIN_KEY and CREDENTIALS_KEY are both needed before a marketplace can be connected.')
})
