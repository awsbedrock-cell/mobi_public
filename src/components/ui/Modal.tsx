import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { IconButton } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg' | 'xl'
}

const widths = { md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }

/** Centered dialog on larger screens, bottom sheet on phones. */
export function Modal({ open, onClose, title, children, footer, size = 'lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-overlay/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-border bg-surface-raised shadow-pop sm:rounded-card',
          widths[size],
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="min-w-0 truncate text-lg font-bold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
