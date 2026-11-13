import { useStore } from '../../context/StoreContext'
import type { PlatformId } from '../../data/types'
import { cn } from '../../lib/utils'

const sizes = { xs: 'h-5 w-5 rounded-md text-[10px]', sm: 'h-7 w-7 rounded-lg text-xs', md: 'h-10 w-10 rounded-xl text-base', lg: 'h-12 w-12 rounded-2xl text-xl' }

/**
 * Marketplace monogram. Marketplace colors are third-party brand identity,
 * so they live in data (Platform.brandColor) instead of Mobi's theme tokens.
 */
export function PlatformLogo({ id, size = 'sm', className }: { id: PlatformId; size?: keyof typeof sizes; className?: string }) {
  const platform = useStore().platforms.find((item) => item.id === id)
  if (!platform) return null
  return (
    <span
      title={platform.name}
      aria-label={platform.name}
      className={cn('inline-flex shrink-0 items-center justify-center font-extrabold lowercase', sizes[size], className)}
      style={{ backgroundColor: platform.brandColor, color: platform.brandFg }}
    >
      {platform.name[0]}
    </span>
  )
}

export function PlatformName({ id }: { id: PlatformId }) {
  const platform = useStore().platforms.find((item) => item.id === id)
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      <PlatformLogo id={id} />
      {platform?.name}
    </span>
  )
}

export function PlatformStack({ ids }: { ids: PlatformId[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {ids.map((id) => (
        <PlatformLogo key={id} id={id} size="xs" />
      ))}
    </span>
  )
}
