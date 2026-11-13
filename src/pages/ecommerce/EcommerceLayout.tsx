import { LayoutDashboard, Package, RefreshCcw, Settings, ShoppingBag } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { NavTabs } from '../../components/ui/Tabs'

const tabs = [
  { to: '/ecommerce', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  { to: '/ecommerce/products', label: 'Products', icon: <Package className="h-4 w-4" /> },
  { to: '/ecommerce/orders', label: 'Orders', icon: <ShoppingBag className="h-4 w-4" /> },
  { to: '/ecommerce/sync-logs', label: 'Sync Logs', icon: <RefreshCcw className="h-4 w-4" /> },
  { to: '/ecommerce/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
]

export default function EcommerceLayout() {
  return (
    <>
      <NavTabs items={tabs} className="mb-4" />
      <Outlet />
    </>
  )
}
