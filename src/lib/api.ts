/** Base URL of the Mobi backend. Empty means the app runs on built-in sample data. */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
export const isLive = API_BASE !== ''

const SESSION_KEY = 'mobi-session'
/** Fired when the server rejects the saved session, so the app returns to the sign-in screen. */
export const SIGNED_OUT_EVENT = 'mobi-signed-out'

/** The signed session token from the server. The password itself is never stored. */
export const session = {
  get: () => {
    try {
      return localStorage.getItem(SESSION_KEY) ?? ''
    } catch {
      return ''
    }
  },
  set: (value: string) => {
    try {
      localStorage.setItem(SESSION_KEY, value)
    } catch {
      /* storage unavailable */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(SESSION_KEY)
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

export async function api<T>(path: string, options: { method?: string; body?: unknown; headers?: Record<string, string>; keepalive?: boolean } = {}): Promise<T> {
  const token = session.get()
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers: { ...(options.body === undefined ? {} : { 'content-type': 'application/json' }), ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      keepalive: options.keepalive,
    })
  } catch {
    throw new ApiError(0, 'Could not reach the Mobi server', null)
  }
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  if (response.status === 401 && token && token === session.get() && !/^\/api\/auth\/(login|setup)$/.test(path)) {
    session.clear()
    window.dispatchEvent(new Event(SIGNED_OUT_EVENT))
  }
  if (!response.ok) throw new ApiError(response.status, body?.error ?? `Request failed (${response.status})`, body)
  return body as T
}
