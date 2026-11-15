import { Check, Eye, EyeOff, ImageUp, Lock, Plus, RotateCcw, Store, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BrandPreview, BrandScope } from '../components/branding/BrandPreview'
import { BrandMark } from '../components/layout/Logo'
import { Badge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { FormField, Select } from '../components/ui/Field'
import { PageHeader } from '../components/ui/Misc'
import { Modal } from '../components/ui/Modal'
import { Tabs } from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { loadFont, useBrand } from '../branding/BrandProvider'
import { newStore } from '../branding/defaults'
import { brandPresets, buttonStyles, cardStyles, fontPairings, getFont, getPreset, navStyles, sameStyle, type BrandStyle } from '../branding/presets'
import { storeTypes, type Brand, type StoreType } from '../branding/types'
import { cn } from '../lib/utils'

type Tab = 'identity' | 'presets' | 'colors' | 'style' | 'stores'
const tabs: Array<{ value: Tab; label: string }> = [
  { value: 'presets', label: 'Industry Presets' },
  { value: 'colors', label: 'Colour Palette' },
  { value: 'style', label: 'Typography & Components' },
  { value: 'identity', label: 'Identity' },
  { value: 'stores', label: 'Stores' },
]

const colorFields: Array<{ key: 'primary' | 'secondary' | 'accent' | 'darkPrimary'; label: string; hint: string }> = [
  { key: 'primary', label: 'Primary', hint: 'Buttons, active navigation, links' },
  { key: 'secondary', label: 'Secondary', hint: 'Supporting highlights and charts' },
  { key: 'accent', label: 'Accent', hint: 'Promotions and emphasis chips' },
  { key: 'darkPrimary', label: 'Primary (dark theme)', hint: 'Optional. Leave automatic unless the primary is very dark' },
]

const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value)

const blankBrand = (): Brand => ({
  id: `b-${Date.now().toString(36)}`,
  name: '',
  tagline: '',
  presetId: 'retail',
  style: { ...getPreset('retail').style },
  stores: [{ ...newStore('Main Store'), id: 'main' }],
})

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: Array<{ id: T; label: string }>; value: T; onChange: (value: T) => void }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div role="radiogroup" aria-label={label} className="inline-flex w-full rounded-control border border-border bg-surface-muted p-1 sm:w-auto">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === value}
            onClick={() => onChange(option.id)}
            className={cn('h-8 flex-1 rounded-[calc(var(--radius-control)-2px)] px-3 text-xs font-semibold transition-colors sm:flex-none', option.id === value ? 'bg-surface text-primary shadow-card' : 'text-text-muted hover:text-text')}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Brands() {
  const [params] = useSearchParams()
  const startNew = params.get('new') ?? ''
  return <BrandEditor key={startNew} startNew={Boolean(startNew)} />
}

function BrandEditor({ startNew }: { startNew: boolean }) {
  const { brands, brand: active, canManage, role, switchBrand, saveBrand, deleteBrand, setPreview, previewing } = useBrand()
  const notify = useToast()
  const [draft, setDraft] = useState<Brand>(() => (startNew && canManage ? blankBrand() : active))
  const [tab, setTab] = useState<Tab>(() => (startNew && canManage ? 'identity' : 'presets'))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [storeType, setStoreType] = useState<StoreType>('Retail Store')

  const saved = brands.find((item) => item.id === draft.id)
  const isNew = !saved
  const dirty = isNew || JSON.stringify(saved) !== JSON.stringify(draft)
  const preset = getPreset(draft.presetId)
  const customised = !sameStyle(draft.style, preset.style)
  const validColors = colorFields.every(({ key }) => (key === 'darkPrimary' && !draft.style.darkPrimary) || isHex(draft.style[key] ?? ''))

  useEffect(() => loadFont(draft.style.font), [draft.style.font])
  useEffect(() => () => setPreview(null), [setPreview])
  const edit = (brand: Brand) => {
    setPreview(null)
    setDraft(brand)
  }
  const setStyle = (changes: Partial<BrandStyle>) => {
    const style = { ...draft.style, ...changes }
    setDraft({ ...draft, style })
    if (previewing) setPreview(style)
  }
  const applyPreset = (id: string) => {
    const style = { ...getPreset(id).style }
    setDraft({ ...draft, presetId: id, style })
    if (previewing) setPreview(style)
  }

  const onLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return notify('Choose an image file', 'error')
    if (file.size > 300_000) return notify('Logo must be under 300 KB', 'error')
    const reader = new FileReader()
    reader.onload = () => setDraft((current) => ({ ...current, logo: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  const save = (thenSwitch: boolean) => {
    const name = draft.name.trim()
    if (!name) {
      setTab('identity')
      return notify('Brand name is required', 'error')
    }
    if (brands.some((item) => item.id !== draft.id && item.name.toLowerCase() === name.toLowerCase())) return notify('Another brand already uses this name', 'error')
    if (!validColors) {
      setTab('colors')
      return notify('Enter colours as 6-digit hex values, e.g. #2563eb', 'error')
    }
    const next = { ...draft, name, tagline: draft.tagline.trim() }
    saveBrand(next)
    setDraft(next)
    setPreview(null)
    if (thenSwitch && next.id !== active.id) switchBrand(next.id)
    notify(isNew ? `${name} created` : `${name} branding saved`)
  }

  const addStore = () => {
    const name = storeName.trim()
    if (!name) return notify('Enter a store name', 'error')
    if (draft.stores.some((item) => item.name.toLowerCase() === name.toLowerCase())) return notify('This brand already has a store with that name', 'error')
    setDraft({ ...draft, stores: [...draft.stores, newStore(name, storeType)] })
    setStoreName('')
  }

  const paletteSwatches = useMemo(() => ['bg-primary', 'bg-primary-soft', 'bg-secondary', 'bg-accent', 'bg-bg', 'bg-surface', 'bg-text', 'bg-success', 'bg-warning', 'bg-error', 'bg-info'], [])

  return (
    <>
      <PageHeader
        title="Brand Management"
        subtitle="Each brand has its own identity, theme, stores and data. Switch brands from the top bar."
        crumbs={[{ label: 'Settings', to: '/settings' }, { label: 'Brands' }]}
        actions={
          canManage && (
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                edit(blankBrand())
                setTab('identity')
              }}
            >
              Add Brand
            </Button>
          )
        }
      />

      {!canManage && (
        <Card className="mb-4 flex items-center gap-3 border-warning/40 bg-warning-soft p-3 sm:p-4">
          <Lock className="h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm">
            You are signed in as <span className="font-semibold">{role}</span>. Only a Store Owner can add, edit or delete brands; you can still switch between them.
          </p>
        </Card>
      )}

      <ul className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {brands.map((item) => (
          <li key={item.id}>
            <Card className={cn('flex h-full flex-col gap-3 p-3.5 transition-colors', item.id === draft.id && 'border-primary ring-1 ring-primary')}>
              <button type="button" onClick={() => edit(item)} className="flex items-center gap-3 text-left" aria-label={`Edit ${item.name}`}>
                {item.logo ? (
                  <BrandMark brand={item} />
                ) : (
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: item.style.primary }}>
                    <span className="h-3 w-3 rounded-full" style={{ background: item.style.accent }} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{item.name}</span>
                  <span className="block truncate text-xs text-text-muted">{getPreset(item.presetId).industry}</span>
                </span>
              </button>
              <div className="mt-auto flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                  <Store className="h-3.5 w-3.5" /> {item.stores.length} {item.stores.length === 1 ? 'store' : 'stores'}
                </span>
                {item.id === active.id ? (
                  <Badge tone="success">Active</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      switchBrand(item.id)
                      notify(`Switched to ${item.name}`, 'info')
                    }}
                  >
                    Switch
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="min-w-0">
          <CardHeader
            title={isNew ? 'New brand' : `Edit ${saved.name}`}
            subtitle={`${preset.name}${customised ? ' · customised' : ''}`}
            action={
              canManage &&
              !isNew &&
              brands.length > 1 && (
                <IconButton label="Delete brand" tone="danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              )
            }
          />
          <div className="px-4 pt-3 sm:px-5">
            <Tabs items={tabs} value={tab} onChange={setTab} />
          </div>

          <fieldset disabled={!canManage} className="min-w-0 p-4 disabled:opacity-70 sm:p-5">
            {tab === 'presets' && (
              <ul className="grid gap-3 sm:grid-cols-2">
                {brandPresets.map((item) => {
                  const selected = item.id === draft.presetId
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => applyPreset(item.id)}
                        aria-pressed={selected}
                        className={cn('flex h-full w-full flex-col gap-2.5 rounded-card border p-3 text-left transition-colors', selected ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary')}
                      >
                        <BrandPreview style={item.style} name={draft.name} compact />
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-text">{item.name}</span>
                            <span className="mt-0.5 block text-xs text-text-muted">{item.description}</span>
                          </span>
                          {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                        </span>
                        <span className="text-[11px] font-medium text-text-subtle">{getFont(item.style.font).label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {tab === 'colors' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {colorFields.map(({ key, label, hint }) => {
                    const value = draft.style[key] ?? ''
                    return (
                      <div key={key}>
                        <label className="label" htmlFor={`color-${key}`}>
                          {label}
                        </label>
                        <div className="flex items-center gap-2">
                          <input type="color" aria-label={`${label} colour picker`} value={isHex(value) ? value : '#000000'} onChange={(event) => setStyle({ [key]: event.target.value })} className="h-10 w-12 shrink-0 cursor-pointer rounded-control border border-field-border bg-field p-1" />
                          <input id={`color-${key}`} className={cn('field font-mono uppercase', value && !isHex(value) && 'border-error')} value={value} placeholder={key === 'darkPrimary' ? 'Automatic' : '#000000'} maxLength={7} onChange={(event) => setStyle({ [key]: event.target.value.trim() || undefined })} />
                        </div>
                        <p className="mt-1 text-xs text-text-muted">{hint}</p>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-text-muted">Backgrounds, surfaces, borders, text and hover states are derived from these colours for both light and dark themes. Status colours (success, warning, error, info) stay consistent across brands so they always mean the same thing.</p>
                <Button variant="outline" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} disabled={!customised} onClick={() => applyPreset(draft.presetId)}>
                  Reset to {preset.name}
                </Button>
              </div>
            )}

            {tab === 'style' && (
              <div className="space-y-5">
                <div>
                  <span className="label">Font pairing</span>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {fontPairings.map((font) => (
                      <li key={font.id}>
                        <button
                          type="button"
                          aria-pressed={font.id === draft.style.font}
                          onClick={() => setStyle({ font: font.id })}
                          onMouseEnter={() => loadFont(font.id)}
                          className={cn('w-full rounded-control border px-3 py-2 text-left transition-colors', font.id === draft.style.font ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary')}
                        >
                          <span className="block text-base font-bold leading-tight text-text" style={{ fontFamily: font.heading }}>
                            Smart retail, simplified
                          </span>
                          <span className="block text-xs text-text-muted" style={{ fontFamily: font.body }}>
                            {font.label}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Segmented label="Buttons & corners" options={buttonStyles} value={draft.style.button} onChange={(button) => setStyle({ button })} />
                  <Segmented label="Navigation" options={navStyles} value={draft.style.nav} onChange={(nav) => setStyle({ nav })} />
                  <Segmented label="Cards" options={cardStyles} value={draft.style.card} onChange={(card) => setStyle({ card })} />
                </div>
              </div>
            )}

            {tab === 'identity' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Brand Name" required>
                  <input className="field" value={draft.name} maxLength={32} placeholder="e.g. FreshMart" onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                </FormField>
                <FormField label="Tagline">
                  <input className="field" value={draft.tagline} maxLength={32} placeholder="e.g. Grocery & Daily Needs" onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} />
                </FormField>
                <div className="sm:col-span-2">
                  <span className="label">Logo</span>
                  <div className="flex flex-wrap items-center gap-3">
                    {draft.logo ? <img src={draft.logo} alt="Brand logo" className="h-14 w-14 rounded-xl border border-border bg-surface object-contain" /> : <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-border-strong text-[11px] font-medium text-text-subtle">Monogram</span>}
                    <label className={cn('inline-flex h-10 items-center gap-2 rounded-button border border-border-strong bg-surface px-4 text-sm font-semibold transition-colors', canManage ? 'cursor-pointer hover:border-primary hover:text-primary' : 'opacity-60')}>
                      <ImageUp className="h-4 w-4" />
                      {draft.logo ? 'Replace logo' : 'Upload logo'}
                      <input type="file" accept="image/*" className="sr-only" onChange={onLogo} />
                    </label>
                    {draft.logo && (
                      <Button variant="ghost" onClick={() => setDraft({ ...draft, logo: undefined })}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-text-muted">PNG, JPG or SVG up to 300 KB. Without a logo the brand's initials are shown on its primary colour.</p>
                </div>
              </div>
            )}

            {tab === 'stores' && (
              <div className="space-y-4">
                <ul className="divide-y divide-border rounded-card border border-border">
                  {draft.stores.map((item) => (
                    <li key={item.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                      <input className="field sm:flex-1" aria-label="Store name" value={item.name} onChange={(event) => setDraft({ ...draft, stores: draft.stores.map((entry) => (entry.id === item.id ? { ...entry, name: event.target.value } : entry)) })} />
                      <div className="flex items-center gap-2">
                        <Select aria-label="Store type" className="sm:w-40" options={storeTypes} value={item.type} onChange={(event) => setDraft({ ...draft, stores: draft.stores.map((entry) => (entry.id === item.id ? { ...entry, type: event.target.value as StoreType } : entry)) })} />
                        <IconButton label={`Remove ${item.name}`} tone="danger" disabled={draft.stores.length <= 1} onClick={() => setDraft({ ...draft, stores: draft.stores.filter((entry) => entry.id !== item.id) })}>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input className="field sm:flex-1" placeholder="New store name" aria-label="New store name" value={storeName} onChange={(event) => setStoreName(event.target.value)} />
                  <Select aria-label="New store type" className="sm:w-40" options={storeTypes} value={storeType} onChange={(event) => setStoreType(event.target.value as StoreType)} />
                  <Button variant="outline" icon={<Plus className="h-4 w-4" />} onClick={addStore}>
                    Add Store
                  </Button>
                </div>
                <p className="text-xs text-text-muted">Stores are locations within this brand. Each one keeps its own stock, customers, expenses and sales.</p>
              </div>
            )}
          </fieldset>

          {canManage && (
            <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-end sm:px-5">
              {dirty && !isNew && (
                <Button variant="ghost" onClick={() => edit(saved)}>
                  Discard changes
                </Button>
              )}
              <Button variant="outline" icon={previewing ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} disabled={!validColors} onClick={() => setPreview(previewing ? null : draft.style)}>
                {previewing ? 'Stop preview' : 'Preview in app'}
              </Button>
              {draft.id !== active.id && (
                <Button variant="secondary" disabled={!dirty && !isNew} onClick={() => save(false)}>
                  Save
                </Button>
              )}
              <Button disabled={draft.id === active.id && !dirty} onClick={() => save(true)}>
                {draft.id === active.id ? 'Save & Apply' : 'Save & Switch'}
              </Button>
            </div>
          )}
        </Card>

        <Card className="self-start xl:sticky xl:top-20">
          <CardHeader title="Live Preview" subtitle={previewing ? 'Also previewing across the whole app' : 'How this brand will look once applied'} />
          <div className="space-y-4 p-4 sm:p-5">
            <BrandPreview style={draft.style} name={draft.name} logo={draft.logo} />
            <div>
              <span className="label">Derived palette</span>
              <PaletteRow style={draft.style} swatches={paletteSwatches} />
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete brand"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const name = draft.name
                const next = brands.find((item) => item.id !== draft.id) ?? active
                deleteBrand(draft.id)
                setDraft(draft.id === active.id ? next : active)
                setConfirmDelete(false)
                notify(`${name} deleted`)
              }}
            >
              Delete Brand
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Delete <span className="font-semibold text-text">{saved?.name}</span> with its branding and {saved?.stores.length} store{saved?.stores.length === 1 ? '' : 's'}? This cannot be undone.
        </p>
      </Modal>
    </>
  )
}

function PaletteRow({ style, swatches }: { style: BrandStyle; swatches: string[] }) {
  return (
    <BrandScope style={style} className="flex">
      {swatches.map((swatch) => (
        <span key={swatch} title={swatch.replace('bg-', '')} className={cn('h-7 flex-1 border-y border-r border-border first:rounded-l-lg first:border-l last:rounded-r-lg', swatch)} />
      ))}
    </BrandScope>
  )
}
