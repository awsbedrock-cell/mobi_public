import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ToastProvider } from './components/ui/Toast'
import { StoreProvider } from './context/StoreContext'
import AddProduct from './pages/AddProduct'
import CustomerDetails from './pages/CustomerDetails'
import Customers from './pages/Customers'
import Dashboard from './pages/Dashboard'
import EcommerceLayout from './pages/ecommerce/EcommerceLayout'
import Overview from './pages/ecommerce/Overview'
import PlatformDetail from './pages/ecommerce/PlatformDetail'
import PlatformOrders from './pages/ecommerce/PlatformOrders'
import PlatformProducts from './pages/ecommerce/PlatformProducts'
import PlatformSettings from './pages/ecommerce/PlatformSettings'
import SyncLogs from './pages/ecommerce/SyncLogs'
import Expenses from './pages/Expenses'
import Inventory from './pages/Inventory'
import NotFound from './pages/NotFound'
import POS from './pages/POS'
import { Brands, Categories, ImportExport } from './pages/ProductGroups'
import Products from './pages/Products'
import ProductsLayout from './pages/ProductsLayout'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import { BrandProvider } from './branding/BrandProvider'
import BrandManagement from './pages/Brands'
import { ThemeProvider } from './theme/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider>
      <BrandProvider>
        <ToastProvider>
      <StoreProvider>
          {/* Hash routing keeps deep links working on static hosts without rewrite rules. */}
          <HashRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="pos" element={<POS />} />
                <Route path="products" element={<ProductsLayout />}>
                  <Route index element={<Products />} />
                  <Route path="add" element={<AddProduct />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="brands" element={<Brands />} />
                  <Route path="import-export" element={<ImportExport />} />
                </Route>
                <Route path="inventory" element={<Inventory />} />
                <Route path="customers" element={<Customers />} />
                <Route path="customers/:id" element={<CustomerDetails />} />
                <Route path="reports" element={<Reports />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="ecommerce" element={<EcommerceLayout />}>
                  <Route index element={<Overview />} />
                  <Route path="products" element={<PlatformProducts />} />
                  <Route path="orders" element={<PlatformOrders />} />
                  <Route path="sync-logs" element={<SyncLogs />} />
                  <Route path="settings" element={<PlatformSettings />} />
                  <Route path="platform/:id" element={<PlatformDetail />} />
                </Route>
                <Route path="settings" element={<Settings />} />
                <Route path="settings/brands" element={<BrandManagement />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </HashRouter>
      </StoreProvider>
        </ToastProvider>
      </BrandProvider>
    </ThemeProvider>
  )
}
