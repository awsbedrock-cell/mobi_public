export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })

export const formatCurrency = (value: number) => inr.format(value)
export const formatCompact = (value: number) => compact.format(value)
export const formatNumber = (value: number) => value.toLocaleString('en-IN')

export function formatDate(iso: string, withTime = false) {
  const date = new Date(iso)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export const dateRanges = ['All Time', 'Today', 'Last 7 Days', 'Last 30 Days'] as const
export type DateRange = (typeof dateRanges)[number]

/** True when an ISO date falls inside the chosen range, counted back from now. */
export function inDateRange(iso: string, range: DateRange): boolean {
  if (range === 'All Time') return true
  const days = range === 'Today' ? 1 : range === 'Last 7 Days' ? 7 : 30
  return Date.now() - new Date(iso).getTime() <= days * 86_400_000
}
