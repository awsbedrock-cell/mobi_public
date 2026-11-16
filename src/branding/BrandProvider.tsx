import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { api, isLive } from '../lib/api'
import { hexToRgb, onColor } from './color'
import { defaultBrands } from './defaults'
import { buildTokens, getFont, isSignatureStyle, type BrandStyle, type TokenMap } from './presets'
import { brandManagers, roles, type Brand, type Role, type StoreLocation } from './types'

const STORAGE_KEY = 'mobi-brands'
/** Generated CSS cached so index.html can apply the brand before first paint. */
const CSS_KEY = 'mobi-brand-css'
const STYLE_ID = 'brand-tokens'

interface Persisted {
  brands: Brand[]
  activeBrandId: string
  activeStores: Record<string, string>
  role: Role
}

interface BrandContextValue {
  brands: Brand[]
  brand: Brand
  store: StoreLocation
  /** The style currently on screen: the active brand's, or a live preview. */
  style: BrandStyle
  previewing: boolean
  role: Role
  canManage: boolean
  /** Stable key for data that belongs to one brand and one store. */
  scope: string
  switchBrand: (id: string) => void
  switchStore: (id: string) => void
  saveBrand: (brand: Brand) => void
  deleteBrand: (id: string) => void
  updateStore: (storeId: string, changes: Partial<StoreLocation>) => void
  setRole: (role: Role) => void
  setPreview: (style: BrandStyle | null) => void
}

const BrandContext = createContext<BrandContextValue | null>(null)

function load(): Persisted {
  const fresh: Persisted = { brands: defaultBrands, activeBrandId: defaultBrands[0].id, activeStores: {}, role: 'Store Owner' }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<Persisted> | null
    if (!saved || !Array.isArray(saved.brands) || saved.brands.length === 0) return fresh
    const brands = saved.brands.filter((item) => item && item.id && item.style && Array.isArray(item.stores) && item.stores.length > 0)
    if (brands.length === 0) return fresh
    return {
      brands,
      activeBrandId: brands.some((item) => item.id === saved.activeBrandId) ? saved.activeBrandId! : brands[0].id,
      activeStores: saved.activeStores ?? {},
      role: roles.includes(saved.role as Role) ? (saved.role as Role) : 'Store Owner',
    }
  } catch {
    return fresh
  }
}

const block = (selector: string, tokens: TokenMap) => `${selector}{${Object.entries(tokens).map(([name, value]) => `${name}:${value}`).join(';')}}`

/** CSS that overrides the base tokens for a brand, in both colour modes. */
export function brandCss(style: BrandStyle) {
  if (isSignatureStyle(style)) return ''
  return `${block(':root:root', buildTokens(style, 'light'))}${block(":root:root[data-theme='dark']", buildTokens(style, 'dark'))}`
}

function applyCss(css: string) {
  let node = document.getElementById(STYLE_ID)
  if (!node) {
    node = document.createElement('style')
    node.id = STYLE_ID
    document.head.appendChild(node)
  }
  node.textContent = css
}

export function loadFont(fontId: string) {
  const font = getFont(fontId)
  if (!font.google) return
  const id = `brand-font-${font.id}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?${font.google}&display=swap`
  document.head.appendChild(link)
}

export const brandInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'B'

function favicon(brand: Brand) {
  if (brand.logo) return brand.logo
  const fg = onColor(hexToRgb(brand.style.primary)).join(',')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${brand.style.primary}"/><text x="16" y="21.5" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="${brandInitials(brand.name).length > 1 ? 13 : 17}" fill="rgb(${fg})">${brandInitials(brand.name)}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load)
  const [preview, setPreview] = useState<BrandStyle | null>(null)

  const brand = state.brands.find((item) => item.id === state.activeBrandId) ?? state.brands[0]
  const store = brand.stores.find((item) => item.id === state.activeStores[brand.id]) ?? brand.stores[0]
  const style = preview ?? brand.style

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable or full (large logos) */
    }
  }, [state])

  // Live mode: brands are shared through the backend. The active brand, store and role stay per browser.
  const account = useAuth().user
  const role = account?.role ?? state.role
  const synced = useRef<Brand[] | null>(null)
  useEffect(() => {
    if (!isLive) return
    let cancelled = false
    api<{ brands: Brand[] } | null>('/api/brands').then(
      (saved) => {
        if (cancelled) return
        const brands = saved?.brands?.filter((item) => item && item.id && item.style && Array.isArray(item.stores) && item.stores.length > 0)
        if (!brands?.length) return void (synced.current = [])
        synced.current = brands
        setState((current) => ({ ...current, brands, activeBrandId: brands.some((item) => item.id === current.activeBrandId) ? current.activeBrandId : brands[0].id }))
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isLive || synced.current === null || synced.current === state.brands || !brandManagers.includes(role)) return
    synced.current = state.brands
    const timer = window.setTimeout(() => void api('/api/brands', { method: 'PUT', body: { brands: state.brands } }).catch(() => undefined), 400)
    return () => window.clearTimeout(timer)
  }, [state.brands, role])

  useEffect(() => {
    loadFont(style.font)
    applyCss(brandCss(style))
  }, [style])

  useEffect(() => {
    try {
      localStorage.setItem(CSS_KEY, brandCss(brand.style))
    } catch {
      /* storage unavailable */
    }
    document.title = `${brand.name} · ${brand.tagline || 'Shop Management'}`
    document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute('href', brand.id === 'mobi' && !brand.logo && isSignatureStyle(brand.style) ? './favicon.svg' : favicon(brand))
  }, [brand])

  const switchBrand = useCallback((id: string) => {
    setPreview(null)
    setState((current) => (current.brands.some((item) => item.id === id) ? { ...current, activeBrandId: id } : current))
  }, [])

  const switchStore = useCallback((id: string) => setState((current) => ({ ...current, activeStores: { ...current.activeStores, [current.activeBrandId]: id } })), [])

  const saveBrand = useCallback((next: Brand) => {
    setState((current) => ({ ...current, brands: current.brands.some((item) => item.id === next.id) ? current.brands.map((item) => (item.id === next.id ? next : item)) : [...current.brands, next] }))
  }, [])

  const deleteBrand = useCallback((id: string) => {
    setState((current) => {
      if (current.brands.length <= 1) return current
      const brands = current.brands.filter((item) => item.id !== id)
      return { ...current, brands, activeBrandId: current.activeBrandId === id ? brands[0].id : current.activeBrandId }
    })
  }, [])

  const updateStore = useCallback((storeId: string, changes: Partial<StoreLocation>) => {
    setState((current) => ({
      ...current,
      brands: current.brands.map((item) => (item.id === current.activeBrandId ? { ...item, stores: item.stores.map((entry) => (entry.id === storeId ? { ...entry, ...changes } : entry)) } : item)),
    }))
  }, [])

  const setRole = useCallback((role: Role) => setState((current) => ({ ...current, role })), [])

  const value = useMemo<BrandContextValue>(
    () => ({
      brands: state.brands,
      brand,
      store,
      style,
      previewing: preview !== null,
      role,
      canManage: brandManagers.includes(role),
      scope: `${brand.id}:${store.id}`,
      switchBrand,
      switchStore,
      saveBrand,
      deleteBrand,
      updateStore,
      setRole,
      setPreview,
    }),
    [state, brand, store, style, preview, switchBrand, switchStore, saveBrand, deleteBrand, updateStore, setRole, role],
  )

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
}

export function useBrand() {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand must be used inside BrandProvider')
  return ctx
}
