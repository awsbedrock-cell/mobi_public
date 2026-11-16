/** Base URL of the Mobi backend. Empty means the app runs on built-in sample data. */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
export const isLive = API_BASE !== ''

const ADMIN_KEY = 'mobi-admin-key'

/** Admin key for marketplace actions. Kept for the browser tab only, never in the build. */
export const adminKey = {
  get: () => {
    try {
      return sessionStorage.getItem(ADMIN_KEY) ?? ''
    } catch {
      return ''
    }
  },
  set: (value: string) => {
    try {
      sessionStorage.setItem(ADMIN_KEY, value)
    } catch {
      /* storage unavailable */
    }
  },
}

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown; admin?: boolean; keepalive?: boolean } = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers: { ...(options.body === undefined ? {} : { 'content-type': 'application/json' }), ...(options.admin ? { 'x-admin-key': adminKey.get() } : {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      keepalive: options.keepalive,
    })
  } catch {
    throw new ApiError(0, 'Could not reach the Mobi server', null)
  }
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  if (!response.ok) throw new ApiError(response.status, body?.error ?? `Request failed (${response.status})`, body)
  return body as T
}
