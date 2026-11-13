import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  /** How the column appears in the stacked mobile card. Defaults to a labelled field. */
  mobile?: 'title' | 'aside' | 'field' | 'hidden'
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  empty?: ReactNode
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' }

/** A real table from the `md` breakpoint up; a stacked card list on phones. */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, empty }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <div className="px-5 py-12 text-center text-sm text-text-muted">{empty ?? 'Nothing to show yet.'}</div>
  }

  const titles = columns.filter((column) => column.mobile === 'title')
  const asides = columns.filter((column) => column.mobile === 'aside')
  const fields = columns.filter((column) => !column.mobile || column.mobile === 'field')

  return (
    <>
      <div className="scroll-thin hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-table-head text-xs text-table-head-fg">
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cn('whitespace-nowrap px-5 py-3 font-semibold', alignClass[column.align ?? 'left'])}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('border-t border-table-border transition-colors hover:bg-table-hover', onRowClick && 'cursor-pointer')}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-5 py-3 align-middle', alignClass[column.align ?? 'left'], column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-table-border md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn('px-4 py-3.5', onRowClick && 'cursor-pointer active:bg-table-hover')}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {titles.map((column) => (
                  <div key={column.key}>{column.render(row)}</div>
                ))}
              </div>
              {asides.length > 0 && (
                <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
                  {asides.map((column) => (
                    <div key={column.key}>{column.render(row)}</div>
                  ))}
                </div>
              )}
            </div>
            {fields.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                {fields.map((column) => (
                  <div key={column.key} className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-text-subtle">{column.header}</dt>
                    <dd className="mt-0.5 truncate font-medium">{column.render(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
