import { Download, IndianRupee, ReceiptText, ShoppingBag, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { BarChart } from '../components/charts/Charts'
import { ProductCell } from '../components/products/ProductThumb'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Select } from '../components/ui/Field'
import { PageHeader, StatCard } from '../components/ui/Misc'
import { Tabs } from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { useStore } from '../context/StoreContext'
import { salesByCategory, salesByPeriod } from '../data/mock'
import { downloadCsv, formatCurrency, formatNumber } from '../lib/utils'

type Period = keyof typeof salesByPeriod
const periods: Period[] = ['Daily', 'Weekly', 'Monthly']
const ranges = ['This Month', 'Last Month', 'Last 90 Days']
const rangeFactor: Record<string, number> = { 'This Month': 1, 'Last Month': 0.93, 'Last 90 Days': 2.71 }

const bestSellers = [
  { id: 'p1', units: 142 },
  { id: 'p2', units: 96 },
  { id: 'p12', units: 388 },
  { id: 'p6', units: 174 },
  { id: 'p7', units: 201 },
]

export default function Reports() {
  const { products, expenses } = useStore()
  const notify = useToast()
  const [period, setPeriod] = useState<Period>('Monthly')
  const [range, setRange] = useState(ranges[0])
  const factor = rangeFactor[range]

  const sales = Math.round(1302200 * factor)
  const orders = Math.round(1422 * factor)
  const spent = Math.round(expenses.reduce((sum, expense) => sum + expense.amount, 0) * factor)
  const profit = Math.round(sales * 0.118) - Math.round(spent * 0.2)

  const exportReport = () => {
    downloadCsv(`mobi-sales-${period.toLowerCase()}.csv`, salesByPeriod[period].map((point) => ({ period: point.label, sales: point.value })))
    notify('Report exported')
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Sales, orders and profitability at a glance."
        actions={
          <>
            <Select aria-label="Date range" className="w-40" options={ranges} value={range} onChange={(event) => setRange(event.target.value)} />
            <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={exportReport}>
              Export
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total Sales" value={formatCurrency(sales)} icon={<IndianRupee className="h-5 w-5" />} delta={8} hint="vs previous" />
        <StatCard label="Total Orders" value={formatNumber(orders)} icon={<ShoppingBag className="h-5 w-5" />} tone="info" delta={5} hint="vs previous" />
        <StatCard label="Avg. Order Value" value={formatCurrency(Math.round(sales / orders))} icon={<ReceiptText className="h-5 w-5" />} tone="warning" />
        <StatCard label="Net Profit" value={formatCurrency(profit)} icon={<TrendingUp className="h-5 w-5" />} tone="success" delta={3} hint="vs previous" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Sales by Period" action={<Tabs items={periods.map((value) => ({ value, label: value }))} value={period} onChange={setPeriod} />} className="flex-col sm:flex-row sm:items-center" />
          <div className="p-4 sm:p-5">
            <BarChart data={salesByPeriod[period]} format={(value) => `₹${value >= 100000 ? `${(value / 100000).toFixed(1)}L` : `${Math.round(value / 1000)}K`}`} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Sales by Category" subtitle="Share of revenue" />
          <ul className="space-y-4 p-4 sm:p-5">
            {salesByCategory.map((item) => (
              <li key={item.label}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="font-bold">{item.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${item.value}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Best Sellers" subtitle="By units sold in the selected range" />
        <ul className="divide-y divide-border px-4 pb-2 pt-2 sm:px-5">
          {bestSellers.map(({ id, units }) => {
            const product = products.find((item) => item.id === id)
            if (!product) return null
            const sold = Math.round(units * factor)
            return (
              <li key={id} className="flex items-center justify-between gap-3 py-3">
                <ProductCell product={product} />
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(sold * product.price)}</p>
                  <p className="text-xs text-text-muted">{sold} units</p>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </>
  )
}
