import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

function pageList(page: number, pages: number): Array<number | 'gap'> {
  if (pages <= 5) return Array.from({ length: pages }, (_, index) => index + 1)
  const list: Array<number | 'gap'> = [1]
  const start = Math.max(2, Math.min(page - 1, pages - 3))
  const end = Math.min(pages - 1, start + 2)
  if (start > 2) list.push('gap')
  for (let p = start; p <= end; p += 1) list.push(p)
  if (end < pages - 1) list.push('gap')
  list.push(pages)
  return list
}

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
  noun?: string
}

export function Pagination({ page, pageSize, total, onChange, noun = 'results' }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const cell = 'inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors'

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row sm:px-5">
      <p className="text-xs text-text-muted">
        Showing {from}–{to} of {total.toLocaleString('en-IN')} {noun}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className={cn(cell, 'border border-border text-text-muted hover:text-primary disabled:opacity-40')}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageList(page, pages).map((item, index) =>
          item === 'gap' ? (
            <span key={`gap-${index}`} className="px-1 text-text-subtle">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onChange(item)}
              className={cn(cell, item === page ? 'bg-primary text-primary-fg' : 'text-text-muted hover:bg-surface-muted')}
            >
              {item}
            </button>
          ),
        )}
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)} className={cn(cell, 'border border-border text-text-muted hover:text-primary disabled:opacity-40')}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
