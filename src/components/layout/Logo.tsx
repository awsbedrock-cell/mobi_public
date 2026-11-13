import { cn } from '../../lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-brand">
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
          <path d="M7 22V11.5l4.6 6.2 4.4-6.2 4.4 6.2 4.6-6.2V22" fill="none" className="stroke-primary-fg" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="block text-lg font-extrabold tracking-tight text-text">MOBI</span>
        <span className="block text-[10px] font-semibold text-text-muted">Mobile Shop</span>
      </span>
    </span>
  )
}
