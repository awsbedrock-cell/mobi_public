import { stockStatus } from '../../context/StoreContext'
import type { Product } from '../../data/types'
import { Badge, type Tone } from '../ui/Badge'

const tones: Record<string, Tone> = { 'In Stock': 'success', 'Low Stock': 'warning', 'Out of Stock': 'error' }

export function StockBadge({ product }: { product: Product }) {
  const status = stockStatus(product)
  return <Badge tone={tones[status]}>{status}</Badge>
}
