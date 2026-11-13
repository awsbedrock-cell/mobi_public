import { useId } from 'react'
import { cn, formatCompact } from '../../lib/utils'

export interface Point {
  label: string
  value: number
}

/** Area line chart. Colors come from theme tokens via Tailwind stroke/fill utilities. */
export function LineChart({ data, className, format = formatCompact }: { data: readonly Point[]; className?: string; format?: (value: number) => string }) {
  const gradientId = useId()
  const width = 100
  const height = 40
  const max = Math.max(...data.map((point) => point.value)) * 1.1
  const x = (index: number) => (index / (data.length - 1)) * width
  const y = (value: number) => height - (value / max) * height
  const line = data.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(2)},${y(point.value).toFixed(2)}`).join(' ')
  const last = data[data.length - 1]
  const ticks = [1, 0.66, 0.33, 0]
  const step = Math.max(1, Math.ceil(data.length / 5))

  return (
    <div className={cn('flex gap-2', className)}>
      <div className="flex flex-col justify-between pb-6 text-right text-[10px] font-medium text-text-subtle">
        {ticks.map((tick) => (
          <span key={tick}>{format(max * tick)}</span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative h-36 sm:h-44">
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-label="Sales trend chart">
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" className="[stop-color:rgb(var(--color-primary))]" stopOpacity="0.28" />
                <stop offset="100%" className="[stop-color:rgb(var(--color-primary))]" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((tick) => (
              <line key={tick} x1="0" x2={width} y1={height - height * tick * (1 / 1.1)} y2={height - height * tick * (1 / 1.1)} className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
            ))}
            <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${gradientId})`} />
            <path d={line} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <span
            className="absolute right-0 -translate-y-[140%] rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-fg shadow-brand"
            style={{ top: `${(y(last.value) / height) * 100}%` }}
          >
            {format(last.value)}
          </span>
          <span className="absolute h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-surface bg-primary" style={{ right: 0, top: `${(y(last.value) / height) * 100}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-medium text-text-subtle">
          {data.map((point, index) => (index % step === 0 || index === data.length - 1 ? <span key={point.label}>{point.label}</span> : null))}
        </div>
      </div>
    </div>
  )
}

export function BarChart({ data, className, format = formatCompact }: { data: readonly Point[]; className?: string; format?: (value: number) => string }) {
  const max = Math.max(...data.map((point) => point.value))
  return (
    <div className={cn('flex h-52 items-end gap-2 sm:gap-4', className)} role="img" aria-label="Sales bar chart">
      {data.map((point, index) => {
        const isPeak = point.value === max
        return (
          <div key={point.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className={cn('truncate text-[11px] font-bold', isPeak ? 'text-primary' : 'text-text-muted')}>{format(point.value)}</span>
            <div
              className={cn('w-full max-w-16 rounded-t-lg transition-all', isPeak ? 'bg-primary' : 'bg-primary-muted', index === data.length - 1 && !isPeak && 'bg-primary/60')}
              style={{ height: `${Math.max(6, (point.value / max) * 78)}%` }}
            />
            <span className="truncate text-[11px] font-medium text-text-subtle">{point.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export interface Segment {
  label: string
  value: number
  /** Tailwind stroke + bg classes drawn from theme tokens. */
  stroke: string
  dot: string
}

export function DonutChart({ segments, centerValue, centerLabel }: { segments: Segment[]; centerValue: string; centerLabel: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1
  const radius = 15.9155
  const starts = segments.map((_, index) => 25 - segments.slice(0, index).reduce((sum, segment) => sum + (segment.value / total) * 100, 0))

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 42 42" className="h-full w-full" role="img" aria-label={centerLabel}>
          <circle cx="21" cy="21" r={radius} fill="none" className="stroke-surface-muted" strokeWidth="5" />
          {segments.map((segment, index) => {
            const share = (segment.value / total) * 100
            return <circle key={segment.label} cx="21" cy="21" r={radius} fill="none" className={segment.stroke} strokeWidth="5" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={starts[index]} />
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold">{centerValue}</span>
          <span className="text-[11px] font-medium text-text-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-2.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-2 text-text-muted">
              <span className={cn('h-2.5 w-2.5 rounded-full', segment.dot)} />
              {segment.label}
            </span>
            <span className="font-bold">
              {segment.value.toLocaleString('en-IN')} <span className="font-medium text-text-subtle">({Math.round((segment.value / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
