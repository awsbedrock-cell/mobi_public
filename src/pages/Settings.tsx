import { Bell, Palette, Store } from 'lucide-react'
import { useState } from 'react'
import { ThemeSegmented } from '../components/layout/ThemeSwitcher'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { FormField, Select, Toggle } from '../components/ui/Field'
import { IconTile, PageHeader } from '../components/ui/Misc'
import { useToast } from '../components/ui/Toast'
import { useTheme } from '../theme/ThemeProvider'

const swatches = [
  { name: 'Primary', className: 'bg-primary' },
  { name: 'Primary soft', className: 'bg-primary-soft' },
  { name: 'Secondary', className: 'bg-secondary' },
  { name: 'Background', className: 'bg-bg' },
  { name: 'Surface', className: 'bg-surface' },
  { name: 'Border', className: 'bg-border-strong' },
  { name: 'Text', className: 'bg-text' },
  { name: 'Text muted', className: 'bg-text-muted' },
  { name: 'Success', className: 'bg-success' },
  { name: 'Warning', className: 'bg-warning' },
  { name: 'Error', className: 'bg-error' },
  { name: 'Info', className: 'bg-info' },
]

export default function Settings() {
  const { preference, resolved } = useTheme()
  const notify = useToast()
  const [shop, setShop] = useState({ name: 'Mobi Mobile Shop', phone: '+91 98765 00000', gstin: '07ABCDE1234F1Z5', address: '24, Nehru Place Market, New Delhi – 110019', currency: 'INR (₹)' })
  const [alerts, setAlerts] = useState({ lowStock: true, dailySummary: true, syncFailures: true, newOrders: false })

  return (
    <>
      <PageHeader title="Settings" subtitle="Appearance, store profile and notifications." />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> Appearance</span>} subtitle="Choose how Mobi looks on this device. Your choice is remembered." />
          <div className="space-y-4 p-4 sm:p-5">
            <ThemeSegmented className="max-w-sm" />
            <p className="text-sm text-text-muted">
              Preference: <span className="font-semibold capitalize text-text">{preference}</span> · currently showing the <span className="font-semibold text-text">{resolved}</span> theme.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Brand Palette" subtitle="Live design tokens from src/styles/tokens.css — edit that file to rebrand." />
          <div className="space-y-4 p-4 sm:p-5">
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {swatches.map((swatch) => (
                <li key={swatch.name}>
                  <span className={`block h-10 rounded-control border border-border ${swatch.className}`} />
                  <span className="mt-1 block truncate text-[11px] font-medium text-text-muted">{swatch.name}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="secondary">
                Secondary
              </Button>
              <Button size="sm" variant="outline">
                Outline
              </Button>
              <Button size="sm" variant="danger">
                Danger
              </Button>
              <Badge tone="success">Success</Badge>
              <Badge tone="warning">Warning</Badge>
              <Badge tone="error">Error</Badge>
              <Badge tone="info">Info</Badge>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-2"><Store className="h-4 w-4 text-primary" /> Store Profile</span>} subtitle="Shown on invoices and receipts." />
          <form
            className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"
            onSubmit={(event) => {
              event.preventDefault()
              notify('Store profile saved')
            }}
          >
            <FormField label="Store Name" required className="sm:col-span-2">
              <input className="field" value={shop.name} onChange={(event) => setShop({ ...shop, name: event.target.value })} />
            </FormField>
            <FormField label="Phone">
              <input className="field" type="tel" value={shop.phone} onChange={(event) => setShop({ ...shop, phone: event.target.value })} />
            </FormField>
            <FormField label="GSTIN">
              <input className="field" value={shop.gstin} onChange={(event) => setShop({ ...shop, gstin: event.target.value })} />
            </FormField>
            <FormField label="Address" className="sm:col-span-2">
              <textarea className="field" rows={2} value={shop.address} onChange={(event) => setShop({ ...shop, address: event.target.value })} />
            </FormField>
            <FormField label="Currency">
              <Select options={['INR (₹)', 'USD ($)', 'AED (د.إ)']} value={shop.currency} onChange={(event) => setShop({ ...shop, currency: event.target.value })} />
            </FormField>
            <div className="flex items-end sm:justify-end">
              <Button type="submit" block className="sm:w-auto">
                Save Changes
              </Button>
            </div>
          </form>
        </Card>

        <Card className="self-start">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notifications</span>} subtitle="Decide what you want to be alerted about." />
          <ul className="divide-y divide-border px-4 py-2 sm:px-5">
            {(
              [
                ['lowStock', 'Low stock alerts', 'When a product reaches its reorder level'],
                ['dailySummary', 'Daily sales summary', 'A recap at closing time'],
                ['syncFailures', 'Marketplace sync failures', 'When a listing or stock sync fails'],
                ['newOrders', 'New online orders', 'Every order from a connected platform'],
              ] as const
            ).map(([key, title, hint]) => (
              <li key={key} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <IconTile tone="neutral" className="h-9 w-9">
                    <Bell className="h-4 w-4" />
                  </IconTile>
                  <div className="min-w-0">
                    <p className="font-semibold">{title}</p>
                    <p className="text-xs text-text-muted">{hint}</p>
                  </div>
                </div>
                <Toggle label={title} checked={alerts[key]} onChange={(value) => setAlerts({ ...alerts, [key]: value })} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
