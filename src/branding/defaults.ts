import { getPreset } from './presets'
import type { Brand, StoreLocation } from './types'

const store = (id: string, name: string, type: StoreLocation['type'], address: string, manager: string, n: number): StoreLocation => ({
  id,
  name,
  type,
  address,
  manager,
  phone: `+91 98765 0${String(n).padStart(4, '0')}`,
  gstin: `07ABCDE${1234 + n}F1Z5`,
})

const brand = (id: string, name: string, tagline: string, presetId: string, city: string, n: number): Brand => ({
  id,
  name,
  tagline,
  presetId,
  style: { ...getPreset(presetId).style },
  stores: [
    store('main', import.meta.env.VITE_STORE_NAME || 'Main Store', 'Retail Store', `24, Nehru Place Market, ${city}`, 'Nishu Singh', n),
    store('outlet', 'City Mall Outlet', 'Outlet', `Shop 112, City Mall, ${city}`, 'Priya Sharma', n + 1),
    store('warehouse', 'Online Warehouse', 'Warehouse', `Plot 7, Logistics Park, ${city}`, 'Arjun Mehta', n + 2),
  ],
})

/** Brands a new account starts with. Users add more from Brand Management. */
export const defaultBrands: Brand[] = [
  brand('mobi', 'Mobi', 'Mobile Shop', 'signature', 'New Delhi – 110019', 0),
  brand('technova', 'TechNova', 'Electronics', 'electronics', 'Bengaluru – 560001', 10),
  brand('urban-gadgets', 'Urban Gadgets', 'Retail & Online', 'retail', 'Mumbai – 400001', 20),
  brand('luxe-mobiles', 'Luxe Mobiles', 'Premium Retail', 'luxury', 'Gurugram – 122002', 30),
]

export const newStore = (name: string, type: StoreLocation['type'] = 'Retail Store'): StoreLocation => ({
  id: `s-${Date.now().toString(36)}`,
  name,
  type,
  phone: '',
  gstin: '',
  address: '',
  manager: '',
})
