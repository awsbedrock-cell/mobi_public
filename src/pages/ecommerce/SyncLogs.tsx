import { RefreshCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PlatformName } from '../../components/ecommerce/PlatformLogo'
import { Badge, type Tone } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { SearchInput, Select } from '../../components/ui/Field'
import { PageHeader, Toolbar } from '../../components/ui/Misc'
import { Pagination } from '../../components/ui/Pagination'
import { useToast } from '../../components/ui/Toast'
import { useStore } from '../../context/StoreContext'
import type { PlatformId, SyncLog, SyncStatus } from '../../data/types'
import { dateRanges, formatDate, inDateRange, type DateRange } from '../../lib/utils'

const PAGE_SIZE = 6
const tones: Record<SyncStatus, Tone> = { Success: 'success', Failed: 'error', Pending: 'warning' }

const columns: Column<SyncLog>[] = [
  { key: 'id', header: 'Log ID', mobile: 'hidden', render: (log) => <span className="text-text-muted">{log.id}</span> },
  { key: 'platform', header: 'Platform', mobile: 'title', render: (log) => <PlatformName id={log.platform} /> },
  { key: 'event', header: 'Event', render: (log) => <span className={log.status === 'Failed' ? 'font-semibold text-error' : 'font-medium'}>{log.event}</span> },
  { key: 'sku', header: 'Product / SKU', render: (log) => log.sku },
  { key: 'time', header: 'Time', render: (log) => <span className="whitespace-nowrap">{formatDate(log.time, true)}</span> },
  { key: 'message', header: 'Details', render: (log) => <span className="whitespace-normal text-text-muted">{log.message}</span> },
  { key: 'status', header: 'Status', mobile: 'aside', render: (log) => <Badge tone={tones[log.status]}>{log.status}</Badge> },
]

export function SyncLogList({ lockedPlatform }: { lockedPlatform?: PlatformId }) {
  const { syncLogs, platforms, syncPlatform, live } = useStore()
  const notify = useToast()
  const [query, setQuery] = useState('')
  const [platformFilter, setPlatform] = useState('all')
  const platform = lockedPlatform ?? platformFilter
  const [eventType, setEventType] = useState('All Events')
  const [range, setRange] = useState<DateRange>('All Time')
  const events = useMemo(() => ['All Events', ...new Set(syncLogs.map((log) => log.event))], [syncLogs])
  const [status, setStatus] = useState('All Status')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return syncLogs.filter(
      (log) => (platform === 'all' || log.platform === platform) && (status === 'All Status' || log.status === status) && (eventType === 'All Events' || log.event === eventType) && inDateRange(log.time, range) && (!term || [log.id, log.sku, log.event, log.message].some((field) => field.toLowerCase().includes(term))),
    )
  }, [syncLogs, query, platform, status, eventType, range])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)

  const syncAll = () => {
    const connected = platforms.filter((item) => item.connected && (!lockedPlatform || item.id === lockedPlatform))
    connected.forEach((item) => syncPlatform(item.id))
    if (!live || connected.length === 0) notify(connected.length ? `Synced ${connected.length} platform${connected.length > 1 ? 's' : ''}` : 'Connect the platform before syncing', connected.length ? 'success' : 'error')
  }

  return (
    <>
      {lockedPlatform ? (
        <div className="mb-3 flex justify-end">
          <Button icon={<RefreshCcw className="h-4 w-4" />} onClick={syncAll}>
            Sync Now
          </Button>
        </div>
      ) : (
        <PageHeader
          title="Sync Logs"
          crumbs={[{ label: 'E-commerce Platforms', to: '/ecommerce' }, { label: 'Sync Logs' }]}
          actions={
            <Button icon={<RefreshCcw className="h-4 w-4" />} onClick={syncAll}>
              Sync All Now
            </Button>
          }
        />
      )}
      <Card>
        <Toolbar className="xl:flex-row xl:items-center sm:flex-col sm:items-stretch">
          <SearchInput className="flex-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by product, SKU or log ID…" aria-label="Search sync logs" />
          <div className="grid grid-cols-2 gap-2 xl:flex">
            {!lockedPlatform && <Select aria-label="Filter by platform" className="xl:w-36" value={platform} onChange={(event) => setPlatform(event.target.value)} options={[{ value: 'all', label: 'All Platforms' }, ...platforms.map((item) => ({ value: item.id, label: item.name }))]} />}
            <Select aria-label="Filter by event" className="xl:w-40" value={eventType} onChange={(event) => setEventType(event.target.value)} options={events} />
            <Select aria-label="Filter by status" className="xl:w-32" value={status} onChange={(event) => setStatus(event.target.value)} options={['All Status', 'Success', 'Failed', 'Pending']} />
            <Select aria-label="Filter by date" className="xl:w-36" value={range} onChange={(event) => setRange(event.target.value as DateRange)} options={[...dateRanges]} />
          </div>
        </Toolbar>
        <DataTable columns={columns} rows={filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)} rowKey={(log) => log.id} empty="No sync events match your filters." />
        <div className="border-t border-border">
          <Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} noun="logs" />
        </div>
      </Card>
    </>
  )
}

export default function SyncLogs() {
  return <SyncLogList />
}
