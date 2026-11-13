import { BarChart3, Boxes, LayoutDashboard, Package, Settings, ShoppingCart, Store, Users, Wallet, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  short: string
  icon: LucideIcon
  end?: boolean
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/pos', label: 'Sales (POS)', short: 'POS', icon: ShoppingCart },
  { to: '/products', label: 'Products', short: 'Products', icon: Package },
  { to: '/inventory', label: 'Inventory', short: 'Stock', icon: Boxes },
  { to: '/customers', label: 'Customers', short: 'Customers', icon: Users },
  { to: '/reports', label: 'Reports', short: 'Reports', icon: BarChart3 },
  { to: '/expenses', label: 'Expenses', short: 'Expenses', icon: Wallet },
  { to: '/ecommerce', label: 'E-commerce Platforms', short: 'E-com', icon: Store },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: Settings },
]
