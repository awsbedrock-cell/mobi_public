import { ChevronRight, UserPlus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DataTable, type Column } from '../components/ui/DataTable'
import { FormField, SearchInput } from '../components/ui/Field'
import { Avatar, PageHeader, Toolbar } from '../components/ui/Misc'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { useToast } from '../components/ui/Toast'
import { useStore } from '../context/StoreContext'
import type { Customer } from '../data/types'
import { formatCurrency, formatDate } from '../lib/utils'

const PAGE_SIZE = 6
const blank = { name: '', phone: '', email: '', address: '' }

export default function Customers() {
  const { customers, addCustomer } = useStore()
  const navigate = useNavigate()
  const notify = useToast()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(blank)
  const [error, setError] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return customers.filter((customer) => !term || [customer.name, customer.phone, customer.email].some((field) => field.toLowerCase().includes(term)))
  }, [customers, query])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const columns: Column<Customer>[] = [
    {
      key: 'customer',
      header: 'Customer',
      mobile: 'title',
      render: (customer) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={customer.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{customer.name}</p>
            <p className="truncate text-xs text-text-muted md:hidden">{customer.phone}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', mobile: 'hidden', render: (customer) => <span className="whitespace-nowrap">{customer.phone}</span> },
    { key: 'email', header: 'Email', mobile: 'hidden', render: (customer) => <span className="text-text-muted">{customer.email}</span> },
    { key: 'total', header: 'Total Purchase', align: 'right', render: (customer) => <span className="font-bold">{formatCurrency(customer.totalPurchase)}</span> },
    { key: 'last', header: 'Last Purchase', render: (customer) => formatDate(customer.lastPurchase) },
    { key: 'status', header: 'Status', mobile: 'hidden', render: (customer) => <Badge tone={customer.status === 'Active' ? 'success' : 'neutral'}>{customer.status}</Badge> },
    { key: 'open', header: '', align: 'right', mobile: 'aside', render: () => <ChevronRight className="h-4 w-4 text-text-subtle" /> },
  ]

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim() || !/^[+\d][\d\s-]{7,}$/.test(form.phone.trim())) {
      setError('Enter a name and a valid phone number.')
      return
    }
    addCustomer({ id: `c${Date.now()}`, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || '—', address: form.address.trim() || '—', status: 'Active', totalPurchase: 0, lastPurchase: new Date().toISOString().slice(0, 10), notes: '', invoices: [] })
    notify(`${form.name.trim()} added`)
    setAdding(false)
    setForm(blank)
    setError('')
  }

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customers on record`}
        actions={
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setAdding(true)}>
            Add Customer
          </Button>
        }
      />
      <Card>
        <Toolbar>
          <SearchInput className="flex-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, phone or email…" aria-label="Search customers" />
        </Toolbar>
        <DataTable columns={columns} rows={rows} rowKey={(customer) => customer.id} onRowClick={(customer) => navigate(`/customers/${customer.id}`)} empty="No customers match your search." />
        <div className="border-t border-border">
          <Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} noun="customers" />
        </div>
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add Customer"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" form="customer-form">
              Save Customer
            </Button>
          </>
        }
      >
        <form id="customer-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          {error && (
            <p role="alert" className="rounded-control bg-error-soft px-3 py-2 text-sm font-medium text-error sm:col-span-2">
              {error}
            </p>
          )}
          <FormField label="Full Name" required>
            <input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoFocus />
          </FormField>
          <FormField label="Phone" required>
            <input className="field" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+91 98765 43210" />
          </FormField>
          <FormField label="Email" className="sm:col-span-2">
            <input className="field" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </FormField>
          <FormField label="Address" className="sm:col-span-2">
            <textarea className="field" rows={2} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </FormField>
        </form>
      </Modal>
    </>
  )
}
