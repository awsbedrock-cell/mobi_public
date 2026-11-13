import { CalendarDays, Plus, Trash2, Wallet } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Badge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { DataTable, type Column } from '../components/ui/DataTable'
import { FormField, SearchInput, Select } from '../components/ui/Field'
import { PageHeader, StatCard, Toolbar } from '../components/ui/Misc'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { useStore } from '../context/StoreContext'
import { expenseCategories } from '../data/mock'
import type { Expense } from '../data/types'
import { formatCurrency, formatDate } from '../lib/utils'

const methods: Expense['method'][] = ['Cash', 'UPI', 'Card', 'Bank Transfer']
const today = () => new Date().toISOString().slice(0, 10)
const blank = () => ({ date: today(), category: expenseCategories[0], description: '', amount: '', method: methods[1] })

export default function Expenses() {
  const { expenses, addExpense, deleteExpense } = useStore()
  const notify = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All Categories')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(blank)
  const [error, setError] = useState('')

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase()
    return expenses.filter((expense) => (category === 'All Categories' || expense.category === category) && (!term || expense.description.toLowerCase().includes(term) || expense.id.toLowerCase().includes(term)))
  }, [expenses, query, category])

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const byCategory = expenseCategories
    .map((name) => ({ name, amount: expenses.filter((expense) => expense.category === name).reduce((sum, expense) => sum + expense.amount, 0) }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const columns: Column<Expense>[] = [
    {
      key: 'description',
      header: 'Description',
      mobile: 'title',
      render: (expense) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{expense.description}</p>
          <p className="text-xs text-text-muted">{expense.id}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (expense) => <Badge tone="primary" dot={false}>{expense.category}</Badge> },
    { key: 'date', header: 'Date', render: (expense) => formatDate(expense.date) },
    { key: 'method', header: 'Paid By', render: (expense) => expense.method },
    { key: 'amount', header: 'Amount', align: 'right', render: (expense) => <span className="font-bold">{formatCurrency(expense.amount)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      mobile: 'aside',
      render: (expense) => (
        <IconButton
          label={`Delete ${expense.id}`}
          tone="danger"
          onClick={() => {
            deleteExpense(expense.id)
            notify('Expense deleted')
          }}
        >
          <Trash2 className="h-4 w-4" />
        </IconButton>
      ),
    },
  ]

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!form.description.trim() || !(amount > 0)) {
      setError('Add a description and an amount greater than zero.')
      return
    }
    const next = Math.max(0, ...expenses.map((expense) => Number(expense.id.replace('EXP-', '')))) + 1
    addExpense({ id: `EXP-${String(next).padStart(4, '0')}`, date: form.date, category: form.category, description: form.description.trim(), amount, method: form.method })
    notify('Expense added')
    setAdding(false)
    setForm(blank())
    setError('')
  }

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Record and review what the shop spends."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
            Add Expense
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Expenses" value={formatCurrency(total)} icon={<Wallet className="h-5 w-5" />} tone="error" />
        <StatCard label="Entries" value={expenses.length} icon={<CalendarDays className="h-5 w-5" />} tone="info" />
        <StatCard label="Largest Category" value={byCategory[0]?.name ?? '—'} icon={<Wallet className="h-5 w-5" />} tone="warning" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card className="min-w-0">
          <Toolbar>
            <SearchInput className="flex-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search expenses…" aria-label="Search expenses" />
            <Select aria-label="Filter by category" className="sm:w-48" options={['All Categories', ...expenseCategories]} value={category} onChange={(event) => setCategory(event.target.value)} />
          </Toolbar>
          <DataTable columns={columns} rows={rows} rowKey={(expense) => expense.id} empty="No expenses match your filters." />
        </Card>

        <Card className="self-start">
          <CardHeader title="By Category" subtitle="Share of total spend" />
          <ul className="space-y-4 p-4 sm:p-5">
            {byCategory.map((item) => (
              <li key={item.name}>
                <div className="mb-1.5 flex justify-between gap-2 text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="font-bold">{formatCurrency(item.amount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(item.amount / total) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add Expense"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" form="expense-form">
              Save Expense
            </Button>
          </>
        }
      >
        <form id="expense-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          {error && (
            <p role="alert" className="rounded-control bg-error-soft px-3 py-2 text-sm font-medium text-error sm:col-span-2">
              {error}
            </p>
          )}
          <FormField label="Description" required className="sm:col-span-2">
            <input className="field" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="e.g. Electricity bill — November" autoFocus />
          </FormField>
          <FormField label="Amount (₹)" required>
            <input className="field" type="number" min={0} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0" />
          </FormField>
          <FormField label="Date">
            <input className="field" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          </FormField>
          <FormField label="Category">
            <Select options={expenseCategories} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          </FormField>
          <FormField label="Paid By">
            <Select options={methods} value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value as Expense['method'] })} />
          </FormField>
        </form>
      </Modal>
    </>
  )
}
