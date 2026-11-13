import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null)

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  error: <XCircle className="h-5 w-5 text-error" />,
  info: <Info className="h-5 w-5 text-info" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextId.current++
    setToasts((list) => [...list.slice(-2), { id, message, tone }])
    window.setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), 3200)
  }, [])

  const value = useMemo(() => notify, [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6">
        {toasts.map((toast) => (
          <div key={toast.id} className={cn('pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-control border border-border bg-surface-raised px-4 py-3 text-sm font-medium shadow-pop')}>
            {icons[toast.tone]}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
