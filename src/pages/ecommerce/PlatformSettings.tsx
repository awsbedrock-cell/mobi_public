import { Bell, KeyRound, ListChecks, RefreshCcw, Settings, ShoppingBag, Store } from 'lucide-react'
import { useState } from 'react'
import { PlatformLogo } from '../../components/ecommerce/PlatformLogo'
import { PlatformSettingsModal } from '../../components/ecommerce/PlatformSettingsModal'
import { Badge } from '../../components/ui/Badge'
import { Button, IconButton } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { FormField, Select, Toggle } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/Misc'
import { useToast } from '../../components/ui/Toast'
import { useStore } from '../../context/StoreContext'
import type { PlatformId } from '../../data/types'
import { cn, formatDate } from '../../lib/utils'

const sections = [
  { id: 'platforms', label: 'Platform Settings', icon: Store },
  { id: 'sync', label: 'Sync Preferences', icon: RefreshCcw },
  { id: 'rules', label: 'Product Rules', icon: ListChecks },
  { id: 'orders', label: 'Order Settings', icon: ShoppingBag },
  { id: 'notifications', label: 'Notifications', icon: Bell },
] as const
type SectionId = (typeof sections)[number]['id']

const toggleGroups: Record<Exclude<SectionId, 'platforms' | 'sync'>, Array<[string, string]>> = {
  rules: [
    ['Auto-list new products', 'List on every connected platform as soon as a product is added'],
    ['Skip products without images', 'Marketplaces reject listings that have no image'],
    ['Unlist when out of stock', 'Pause listings automatically at zero stock'],
  ],
  orders: [
    ['Import orders automatically', 'Pull new marketplace orders into Mobi'],
    ['Reserve stock on new order', 'Hold units as soon as an order arrives'],
    ['Auto-generate invoice', 'Create a GST invoice for each imported order'],
  ],
  notifications: [
    ['Sync failures', 'Alert when a listing, price or stock sync fails'],
    ['New orders', 'Alert for each new marketplace order'],
    ['Listing rejected', 'Alert when a marketplace rejects a listing'],
  ],
}

export default function PlatformSettings() {
  const { platforms, togglePlatform, syncPlatform } = useStore()
  const notify = useToast()
  const [section, setSection] = useState<SectionId>('platforms')
  const [settingsFor, setSettingsFor] = useState<{ id: PlatformId; section: 'general' | 'api' } | null>(null)
  const [off, setOff] = useState<string[]>(['New orders'])
  const [frequency, setFrequency] = useState('Every 15 minutes')

  return (
    <>
      <PageHeader title="Settings" crumbs={[{ label: 'E-commerce Platforms', to: '/ecommerce' }, { label: 'Settings' }]} />
      <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
        <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:flex-col lg:px-0">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={cn('inline-flex h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-control px-3 text-sm font-semibold transition-colors', section === id ? 'bg-primary-soft text-primary' : 'text-text-muted hover:bg-surface-muted')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        <Card className="min-w-0">
          {section === 'platforms' && (
            <>
              <div className="px-4 pt-4 sm:px-5 sm:pt-5">
                <h2 className="text-base font-bold">Platform Settings</h2>
                <p className="text-xs text-text-muted">Manage your marketplace connections.</p>
              </div>
              <ul className="divide-y divide-border px-4 py-2 sm:px-5">
                {platforms.map((platform) => (
                  <li key={platform.id} className="flex flex-wrap items-center gap-3 py-3">
                    <PlatformLogo id={platform.id} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{platform.name}</p>
                      <p className="truncate text-xs text-text-muted">Last sync: {formatDate(platform.lastSync, true)}</p>
                    </div>
                    <Badge tone={platform.connected ? 'success' : 'neutral'}>{platform.connected ? 'Connected' : 'Disconnected'}</Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (!platform.connected) togglePlatform(platform.id)
                          syncPlatform(platform.id)
                          notify(`${platform.name} reconnected`)
                        }}
                      >
                        Reconnect
                      </Button>
                      <Button size="sm" variant="outline" icon={<KeyRound className="h-4 w-4" />} onClick={() => setSettingsFor({ id: platform.id, section: 'api' })}>
                        API
                      </Button>
                      <IconButton label={`${platform.name} settings`} onClick={() => setSettingsFor({ id: platform.id, section: 'general' })}>
                        <Settings className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {section === 'sync' && (
            <div className="space-y-4 p-4 sm:p-5">
              <h2 className="text-base font-bold">Sync Preferences</h2>
              <FormField label="Sync frequency" className="max-w-sm">
                <Select options={['Every 5 minutes', 'Every 15 minutes', 'Every hour', 'Manual only']} value={frequency} onChange={(event) => setFrequency(event.target.value)} />
              </FormField>
              <FormField label="When prices conflict" className="max-w-sm">
                <Select options={['Mobi price wins', 'Marketplace price wins', 'Ask me each time']} />
              </FormField>
              <Button onClick={() => notify('Sync preferences saved')}>Save Preferences</Button>
            </div>
          )}

          {section !== 'platforms' && section !== 'sync' && (
            <div className="p-4 sm:p-5">
              <h2 className="text-base font-bold">{sections.find((item) => item.id === section)?.label}</h2>
              <ul className="mt-2 divide-y divide-border">
                {toggleGroups[section].map(([title, hint]) => (
                  <li key={title} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{title}</p>
                      <p className="text-xs text-text-muted">{hint}</p>
                    </div>
                    <Toggle label={title} checked={!off.includes(title)} onChange={(value) => setOff((list) => (value ? list.filter((item) => item !== title) : [...list, title]))} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
      {settingsFor && <PlatformSettingsModal platformId={settingsFor.id} initialSection={settingsFor.section} onClose={() => setSettingsFor(null)} />}
    </>
  )
}
