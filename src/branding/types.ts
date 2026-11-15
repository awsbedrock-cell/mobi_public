import type { BrandStyle } from './presets'

export type StoreType = 'Retail Store' | 'Outlet' | 'Warehouse'
export const storeTypes: StoreType[] = ['Retail Store', 'Outlet', 'Warehouse']

export interface StoreLocation {
  id: string
  name: string
  type: StoreType
  phone: string
  gstin: string
  address: string
  manager: string
}

export interface Brand {
  id: string
  name: string
  tagline: string
  /** Uploaded logo as a data URL; a monogram is shown when absent. */
  logo?: string
  presetId: string
  style: BrandStyle
  stores: StoreLocation[]
}

export type Role = 'Store Owner' | 'Manager' | 'Cashier'
export const roles: Role[] = ['Store Owner', 'Manager', 'Cashier']
/** Roles allowed to add, edit, restyle or delete brands. */
export const brandManagers: Role[] = ['Store Owner']
