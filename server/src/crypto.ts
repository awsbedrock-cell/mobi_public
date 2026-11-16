import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/** AES-256-GCM for marketplace credentials. The key is derived from CREDENTIALS_KEY. */
export function createVault(secret = process.env.CREDENTIALS_KEY) {
  const key = secret ? createHash('sha256').update(secret).digest() : null
  return {
    ready: key !== null,
    seal(value: unknown) {
      if (!key) throw new Error('CREDENTIALS_KEY is not set on the server')
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
      return [iv, cipher.getAuthTag(), body].map((part) => part.toString('base64')).join('.')
    },
    open<T>(sealed: string): T {
      if (!key) throw new Error('CREDENTIALS_KEY is not set on the server')
      const [iv, tag, body] = sealed.split('.').map((part) => Buffer.from(part, 'base64'))
      const decipher = createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)
      return JSON.parse(Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8')) as T
    },
  }
}
export type Vault = ReturnType<typeof createVault>
