import { ArrowRight, BarChart3, CalendarDays, PackagePlus, ReceiptText, RefreshCcw, ScanLine, ShoppingBag, ShoppingCart, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart } from '../components/charts/Charts'
import { ProductCell } from '../components/products/ProductThumb'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { IconTile, StatCard } from '../components/ui/Misc'
import { stockStatus, useStore } from '../context/StoreContext'
import { salesToday as trend } from '../data/mock'
import { formatCurrency, formatNumber } from '../lib/utils'

const quickActions = [
  { to: '/products/add?mode=manual', label: 'Add Product', icon: PackagePlus, tone: 'primary' },
  { to: '/inventory', label: 'Update Stock', icon: RefreshCcw, tone: 'warning' },
  { to: '/products/add', label: 'Scan Product', icon: ScanLine, tone: 'info' },
  { to: '/reports', label: 'View Reports', icon: BarChart3, tone: 'success' },
] as const

const topSellers = [
  { id: 'p1', sold: 12 },
  { id: 'p2', sold: 8 },
  { id: 'p3', sold: 6 },
  { id: 'p6', sold: 5 },
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export default function Dashboard() {
  const { products, customers, salesToday, expenses } = useStore()
  const [today] = useState(() => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))
  const [hello] = useState(greeting)
  const lowStock = products.filter((product) => stockStatus(product) !== 'In Stock')
  const monthExpenses = expenses.filter((expense) => expense.date.startsWith('2026-10')).reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{hello}, Nishu</h1>
          <p className="mt-1 text-sm text-text-muted">Manage your store faster, smarter and easier.</p>
        </div>
        <span className="inline-flex h-9 w-fit items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-primary" />
          Today, {today}
        </span>
      </div>

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4 sm:space-y-5">
          <Card className="relative overflow-hidden border-primary/20 bg-primary-soft p-5 sm:p-6">
            <div className="relative z-10 max-w-sm">
              <span className="inline-block rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-bold text-warning">Most used</span>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">Make a Sale</h2>
              <p className="mt-1 text-sm text-text-muted">Bill a customer in seconds.</p>
              <Link to="/pos" className="mt-4 inline-block">
                <Button iconRight={<ArrowRight className="h-4 w-4" />}>Sales Mode</Button>
              </Link>
            </div>
            <ReceiptText className="pointer-events-none absolute -bottom-6 right-2 h-40 w-40 rotate-12 text-primary/15 sm:right-10 sm:h-48 sm:w-48" strokeWidth={1} />
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {quickActions.map(({ to, label, icon: Icon, tone }) => (
              <Link key={label} to={to}>
                <Card className="flex h-full flex-col items-center gap-2.5 p-4 text-center transition-colors hover:border-primary">
                  <IconTile tone={tone} className="h-12 w-12">
                    <Icon className="h-6 w-6" />
                  </IconTile>
                  <span className="text-sm font-bold">{label}</span>
                </Card>
              </Link>
            ))}
          </div>

          <section>
            <h2 className="mb-3 text-base font-bold">Today at a Glance</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <StatCard label="Sales Today" value={formatCurrency(salesToday.total)} icon={<ShoppingCart className="h-5 w-5" />} delta={12} hint="vs yesterday" />
              <StatCard label="Orders" value={formatNumber(salesToday.orders)} icon={<ShoppingBag className="h-5 w-5" />} tone="info" />
              <StatCard label="Customers" value={formatNumber(114 + customers.length)} icon={<Users className="h-5 w-5" />} tone="success" />
            </div>
          </section>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <Card>
            <CardHeader title="Sales Trend" subtitle="Today, by hour" />
            <div className="p-4 sm:p-5">
              <LineChart data={trend} format={(value) => `₹${Math.round(value / 1000)}K`} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Top Products"
              action={
                <Link to="/products" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  View more <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <ul className="divide-y divide-border px-4 pb-2 pt-2 sm:px-5">
              {topSellers.map(({ id, sold }) => {
                const product = products.find((item) => item.id === id)
                if (!product) return null
                return (
                  <li key={id} className="flex items-center justify-between gap-3 py-2.5">
                    <ProductCell product={product} subtitle={formatCurrency(product.price)} />
                    <span className="text-sm font-bold">{sold} sold</span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
        <Card>
          <CardHeader
            title="Stock Alerts"
            subtitle={`${lowStock.length} products need attention`}
            action={
              <Link to="/inventory" className="text-xs font-semibold text-primary hover:underline">
                Manage stock
              </Link>
            }
          />
          <ul className="divide-y divide-border px-4 pb-2 pt-2 sm:px-5">
            {lowStock.slice(0, 4).map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                <ProductCell product={product} />
                <span className={product.stock === 0 ? 'text-sm font-bold text-error' : 'text-sm font-bold text-warning'}>{product.stock === 0 ? 'Out of stock' : `${product.stock} left`}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="flex flex-col">
          <CardHeader
            title="Expenses This Month"
            subtitle="October 2026"
            action={
              <Link to="/expenses" className="text-xs font-semibold text-primary hover:underline">
                View all
              </Link>
            }
          />
          <div className="flex flex-1 items-center gap-4 p-4 sm:p-5">
            <IconTile tone="error" className="h-14 w-14">
              <Wallet className="h-7 w-7" />
            </IconTile>
            <div>
              <p className="text-3xl font-extrabold tracking-tight">{formatCurrency(monthExpenses)}</p>
              <p className="text-sm text-text-muted">across {expenses.length} entries · rent and salaries lead</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
