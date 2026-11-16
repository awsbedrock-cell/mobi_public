import { Boxes, Eye, EyeOff, IndianRupee, Info, KeyRound, LayoutGrid, RefreshCcw, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../context/StoreContext'
import { categories } from '../../data/mock'
import type { PlatformId } from '../../data/types'
import { adminKey } from '../../lib/api'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { FormField, Select, Toggle } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { PlatformLogo } from './PlatformLogo'

const sections = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'api', label: 'API Settings', icon: KeyRound },
  { id: 'pricing', label: 'Pricing', icon: IndianRupee },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'mapping', label: 'Category Mapping', icon: LayoutGrid },
  { id: 'sync', label: 'Sync & Automation', icon: RefreshCcw },
] as const

type SectionId = (typeof sections)[number]['id']

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
        {label}
        {hint && (
          <span title={hint}>
            <Info className="h-3.5 w-3.5 text-text-subtle" />
          </span>
        )}
      </span>
      <Toggle label={label} checked={checked} onChange={onChange} />
    </div>
  )
}

export function PlatformSettingsModal({ platformId, onClose, initialSection = 'general' }: { platformId: PlatformId; onClose: () => void; initialSection?: SectionId }) {
  const { platforms, togglePlatform, updatePlatform, syncPlatform, live, connectPlatform } = useStore()
  const notify = useToast()
  const platform = platforms.find((item) => item.id === platformId)
  const [section, setSection] = useState<SectionId>(initialSection)
  const [flags, setFlags] = useState({ autoList: true, autoPrice: true, autoInventory: true, importOrders: true, pauseOnZero: true })
  const [markup, setMarkup] = useState(5)
  const [buffer, setBuffer] = useState(2)
  const [interval, setIntervalValue] = useState('Every 15 minutes')
  const [sellerId, setSellerId] = useState(platform?.sellerId ?? '')
  const [apiKey, setApiKey] = useState(platform?.apiKey ?? '')
  const [showKey, setShowKey] = useState(false)
  const [apiError, setApiError] = useState('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [admin, setAdmin] = useState(adminKey.get)
  const [busy, setBusy] = useState(false)
  if (!platform) return null

  const flag = (key: keyof typeof flags) => ({ checked: flags[key], onChange: (value: boolean) => setFlags({ ...flags, [key]: value }) })

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={`${platform.name} — Platform Settings`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              notify(`${platform.name} settings saved`)
              onClose()
            }}
          >
            Save Settings
          </Button>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <PlatformLogo id={platform.id} size="md" />
        <span className="text-base font-extrabold">{platform.name}</span>
        <Badge tone={platform.connected ? 'success' : 'neutral'}>{platform.connected ? 'Connected' : 'Disconnected'}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-[13rem_1fr]">
        <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:flex-col md:px-0">
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

        <div className="min-w-0 rounded-card border border-border p-4">
          {section === 'general' && (
            <div className="space-y-4">
              <h3 className="font-bold">General Settings</h3>
              <FormField label="Store / Marketplace">
                <Select options={[platform.marketplace, `${platform.name} Global`]} defaultValue={platform.marketplace} />
              </FormField>
              <div>
                <span className="label">API Connection</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={platform.connected ? 'success' : 'neutral'}>{platform.connected ? 'Connected' : 'Disconnected'}</Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (live) return platform.connected ? syncPlatform(platform.id) : setSection('api')
                      if (!platform.connected) togglePlatform(platform.id)
                      syncPlatform(platform.id)
                      notify(`${platform.name} reconnected`)
                    }}
                  >
                    Reconnect
                  </Button>
                </div>
              </div>
              <div className="divide-y divide-border border-t border-border">
                <ToggleRow label="Auto List New Products" {...flag('autoList')} />
                <ToggleRow label="Auto Update Price" hint="Push price changes to the marketplace as soon as you save them." {...flag('autoPrice')} />
                <ToggleRow label="Auto Update Inventory" hint="Keep marketplace stock equal to store stock minus the safety buffer." {...flag('autoInventory')} />
              </div>
            </div>
          )}
          {section === 'api' && live && platform.link && !platform.link.available && (
            <div className="space-y-3">
              <h3 className="font-bold">API Settings</h3>
              <p className="text-sm text-text-muted">{platform.link.note}</p>
              <Button variant="outline" onClick={() => window.open(platform.portalUrl, '_blank', 'noopener')}>
                Open {platform.name} seller portal
              </Button>
            </div>
          )}
          {section === 'api' && live && platform.link?.available && (
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault()
                adminKey.set(admin.trim())
                setBusy(true)
                const error = await connectPlatform(platform.id, credentials)
                setBusy(false)
                setApiError(error ?? '')
                if (error) return
                setCredentials({})
                notify(`${platform.name} connected`)
              }}
            >
              <h3 className="font-bold">API Settings</h3>
              <p className="text-sm text-text-muted">
                {platform.link.note}{' '}
                <a className="font-semibold text-primary underline" href={platform.link.docsUrl} target="_blank" rel="noopener noreferrer">
                  Setup guide
                </a>
              </p>
              {platform.connected && <p className="text-sm font-medium">Connected as {platform.sellerId}. Enter new credentials to replace the saved ones.</p>}
              {platform.link.lastError && <p className="text-sm font-medium text-error">Last sync failed: {platform.link.lastError}</p>}
              {platform.link.fields.map((field) => (
                <FormField key={field.key} label={field.label}>
                  <input
                    className="field"
                    type={field.secret ? 'password' : 'text'}
                    value={credentials[field.key] ?? ''}
                    onChange={(event) => setCredentials({ ...credentials, [field.key]: event.target.value })}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    required
                  />
                </FormField>
              ))}
              <FormField label="Mobi admin key">
                <input className="field" type="password" value={admin} onChange={(event) => setAdmin(event.target.value)} placeholder="Set as ADMIN_KEY on the Mobi server" autoComplete="off" required />
              </FormField>
              {apiError && <p className="text-sm font-medium text-error">{apiError}</p>}
              <p className="text-xs text-text-muted">Mobi checks these with {platform.name} before saving. They are stored encrypted on the Mobi server and are never shown again.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Checking…' : platform.connected ? 'Replace credentials' : `Connect ${platform.name}`}
                </Button>
                {platform.connected && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      adminKey.set(admin.trim())
                      togglePlatform(platform.id)
                    }}
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </form>
          )}
          {section === 'api' && !live && (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (!sellerId.trim() || apiKey.trim().length < 8) {
                  setApiError('Enter your Seller ID and an API key of at least 8 characters.')
                  return
                }
                setApiError('')
                updatePlatform(platform.id, { sellerId: sellerId.trim(), apiKey: apiKey.trim(), connected: true })
                syncPlatform(platform.id)
                notify(`${platform.name} credentials saved and reconnected`)
              }}
            >
              <h3 className="font-bold">API Settings</h3>
              <FormField label="Seller / Merchant ID">
                <input className="field" value={sellerId} onChange={(event) => setSellerId(event.target.value)} placeholder={`Your ${platform.name} seller ID`} autoComplete="off" />
              </FormField>
              <FormField label="API Key">
                <div className="flex gap-2">
                  <input className="field flex-1" type={showKey ? 'text' : 'password'} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste the key from your seller portal" autoComplete="off" />
                  <Button type="button" variant="outline" aria-label={showKey ? 'Hide API key' : 'Show API key'} onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </FormField>
              {apiError && <p className="text-sm font-medium text-error">{apiError}</p>}
              <p className="text-xs text-text-muted">Credentials are kept in this browser session only and are cleared on reload. Live marketplace calls need the Mobi backend API.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Save &amp; Reconnect</Button>
                {platform.connected && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      togglePlatform(platform.id)
                      notify(`${platform.name} disconnected`, 'info')
                    }}
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </form>
          )}
          {section === 'pricing' && (
            <div className="space-y-4">
              <h3 className="font-bold">Pricing</h3>
              <FormField label="Marketplace markup (%)">
                <input className="field" type="number" min={0} max={100} value={markup} onChange={(event) => setMarkup(Math.max(0, Number(event.target.value) || 0))} />
              </FormField>
              <p className="text-sm text-text-muted">A ₹1,000 product will be listed at ₹{(1000 * (1 + markup / 100)).toLocaleString('en-IN')} to cover marketplace fees.</p>
              <FormField label="Rounding">
                <Select options={['End in 9 (₹1,049)', 'End in 0 (₹1,050)', 'No rounding']} />
              </FormField>
            </div>
          )}
          {section === 'inventory' && (
            <div className="space-y-4">
              <h3 className="font-bold">Inventory</h3>
              <FormField label="Safety buffer (units held back)">
                <input className="field" type="number" min={0} value={buffer} onChange={(event) => setBuffer(Math.max(0, Number(event.target.value) || 0))} />
              </FormField>
              <div className="border-t border-border">
                <ToggleRow label="Pause listing when out of stock" {...flag('pauseOnZero')} />
              </div>
            </div>
          )}
          {section === 'mapping' && (
            <div className="space-y-3">
              <h3 className="font-bold">Category Mapping</h3>
              {categories.map((category) => (
                <div key={category} className="grid items-center gap-2 sm:grid-cols-[9rem_1fr]">
                  <span className="text-sm font-medium">{category}</span>
                  <Select aria-label={`${platform.name} category for ${category}`} options={[`Electronics › ${category}`, `Mobiles & Accessories › ${category}`, 'Not mapped']} />
                </div>
              ))}
            </div>
          )}
          {section === 'sync' && (
            <div className="space-y-4">
              <h3 className="font-bold">Sync &amp; Automation</h3>
              <FormField label="Sync frequency">
                <Select options={['Every 5 minutes', 'Every 15 minutes', 'Every hour', 'Manual only']} value={interval} onChange={(event) => setIntervalValue(event.target.value)} />
              </FormField>
              <div className="border-t border-border">
                <ToggleRow label="Import orders automatically" {...flag('importOrders')} />
              </div>
              <Button
                variant="secondary"
                icon={<RefreshCcw className="h-4 w-4" />}
                onClick={() => {
                  syncPlatform(platform.id)
                  if (!live) notify(`${platform.name} synced`)
                }}
              >
                Sync Now
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
