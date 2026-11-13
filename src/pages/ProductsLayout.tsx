import { FileUp, LayoutGrid, List, Plus, Tag } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { NavTabs } from '../components/ui/Tabs'

const tabs = [
  { to: '/products', label: 'All Products', icon: <List className="h-4 w-4" />, end: true },
  { to: '/products/add', label: 'Add Product', icon: <Plus className="h-4 w-4" /> },
  { to: '/products/categories', label: 'Categories', icon: <LayoutGrid className="h-4 w-4" /> },
  { to: '/products/brands', label: 'Brands', icon: <Tag className="h-4 w-4" /> },
  { to: '/products/import-export', label: 'Import / Export', icon: <FileUp className="h-4 w-4" /> },
]

export default function ProductsLayout() {
  return (
    <>
      <NavTabs items={tabs} className="mb-4" />
      <Outlet />
    </>
  )
}
