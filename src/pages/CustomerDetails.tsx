import { Download, Mail, MapPin, Phone, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DataTable, type Column } from '../components/ui/DataTable'
import { Avatar, PageHeader } from '../components/ui/Misc'
import { Tabs } from '../components/ui/Tabs'
import { useStore } from '../context/StoreContext'
import type { Invoice } from '../data/types'
import { downloadCsv, formatCurrency, formatDate } from '../lib/utils'
import { useToast } from '../components/ui/Toast'

type Tab = 'history' | 'billing' | 'notes'

const columns: Column<Invoice>[] = [
  { key: 'invoice', header: 'Invoice #', mobile: 'title', render: (invoice) => <span className="font-semibold text-primary">{invoice.id}</span> },
  { key: 'date', header: 'Date', render: (invoice) => formatDate(invoice.date) },
  { key: 'items', header: 'Items', render: (invoice) => <span className="text-text-muted">{invoice.items}</span> },
  { key: 'amount', header: 'Amount', align: 'right', mobile: 'aside', render: (invoice) => <span className="font-bold">{formatCurrency(invoice.amount)}</span> },
]

const billingColumns: Column<Invoice>[] = [
  columns[0],
  columns[1],
  { key: 'payment', header: 'Payment', render: (invoice) => invoice.payment ?? 'UPI' },
  { key: 'status', header: 'Status', render: () => <Badge tone="success">Paid</Badge> },
  columns[3],
]

export default function CustomerDetails() {
  const { id } = useParams()
  const { customers, updateCustomer } = useStore()
  const notify = useToast()
  const customer = customers.find((item) => item.id === id)
  const [tab, setTab] = useState<Tab>('history')
  const [note, setNote] = useState(customer?.notes ?? '')

  if (!customer) {
    return (
      <Card className="p-10 text-center">
        <p className="font-bold">Customer not found</p>
        <Link to="/customers" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
          Back to customers
        </Link>
      </Card>
    )
  }

  const orders = customer.invoices.length
  const stats = [
    { label: 'Total Purchase', value: formatCurrency(customer.totalPurchase) },
    { label: 'Orders', value: String(orders) },
    { label: 'Avg. Order', value: formatCurrency(orders ? Math.round(customer.totalPurchase / orders) : 0) },
    { label: 'Last Purchase', value: formatDate(customer.lastPurchase) },
  ]

  return (
    <>
      <PageHeader
        title="Customer Details"
        crumbs={[{ label: 'Customers', to: '/customers' }, { label: customer.name }]}
        actions={
          <Link to="/pos">
            <Button icon={<ShoppingCart className="h-4 w-4" />}>New Sale</Button>
          </Link>
        }
      />

      <Card className="mb-4 p-4 sm:p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar name={customer.name} size="lg" />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold">{customer.name}</h2>
                <Badge tone={customer.status === 'Active' ? 'success' : 'neutral'}>{customer.status}</Badge>
              </div>
              <p className="flex items-center gap-2 text-sm text-text-muted">
                <Phone className="h-3.5 w-3.5 shrink-0" /> {customer.phone}
              </p>
              <p className="flex items-center gap-2 break-all text-sm text-text-muted">
                <Mail className="h-3.5 w-3.5 shrink-0" /> {customer.email}
              </p>
              <p className="flex items-start gap-2 text-sm text-text-muted">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {customer.address}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto lg:shrink-0">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-surface-muted px-4 py-3">
                <dt className="text-[11px] font-medium text-text-muted">{stat.label}</dt>
                <dd className="mt-0.5 whitespace-nowrap text-base font-extrabold">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <Card>
        <div className="border-b border-border px-3 py-2 sm:px-4">
          <Tabs
            items={[
              { value: 'history', label: 'Purchase History' },
              { value: 'billing', label: 'Billing Info' },
              { value: 'notes', label: 'Notes' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
        {tab === 'history' && <DataTable columns={columns} rows={customer.invoices} rowKey={(invoice) => invoice.id} empty="No purchases yet." />}
        {tab === 'billing' && (
          <>
            <dl className="grid gap-4 p-4 text-sm sm:grid-cols-3 sm:p-5">
              {[
                ['Billing Name', customer.name],
                ['Phone', customer.phone],
                ['Email', customer.email],
                ['Billing Address', customer.address],
                ['Total Billed', formatCurrency(customer.totalPurchase)],
                ['Outstanding', formatCurrency(0)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs font-medium text-text-muted">{label}</dt>
                  <dd className="mt-0.5 break-words font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
              <h3 className="text-sm font-bold">Billing History</h3>
              <Button
                size="sm"
                variant="outline"
                icon={<Download className="h-4 w-4" />}
                disabled={customer.invoices.length === 0}
                onClick={() => downloadCsv(`${customer.name.replace(/\s+/g, '-').toLowerCase()}-billing.csv`, customer.invoices.map((invoice) => ({ Invoice: invoice.id, Date: invoice.date, Items: invoice.items, Payment: invoice.payment ?? 'UPI', Amount: invoice.amount, Status: 'Paid' })))}
              >
                Export
              </Button>
            </div>
            <DataTable columns={billingColumns} rows={customer.invoices} rowKey={(invoice) => invoice.id} empty="No bills yet." />
          </>
        )}
        {tab === 'notes' && (
          <form
            className="space-y-3 p-4 sm:p-5"
            onSubmit={(event) => {
              event.preventDefault()
              updateCustomer(customer.id, { notes: note.trim() })
              notify('Notes saved')
            }}
          >
            <label className="label" htmlFor="customer-notes">
              Notes about {customer.name}
            </label>
            <textarea id="customer-notes" className="field" rows={5} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Preferences, follow-ups, warranty details…" />
            <Button type="submit" disabled={note.trim() === customer.notes}>
              Save Notes
            </Button>
          </form>
        )}
      </Card>
    </>
  )
}
