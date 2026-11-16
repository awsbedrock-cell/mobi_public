import { amazon } from './amazon.ts'
import { flipkart } from './flipkart.ts'
import type { Marketplace, PlatformId } from './types.ts'

const partnerOnly = (id: PlatformId, name: string, docsUrl: string): Marketplace => ({
  id,
  name,
  available: false,
  note: `${name} does not offer a self-service seller API. Ask your ${name} account manager for partner API access; a connector can be added here once you have it.`,
  docsUrl,
  fields: [],
})

/** Add a marketplace by implementing the Marketplace interface and listing it here. */
export const marketplaces: Marketplace[] = [
  amazon,
  flipkart,
  partnerOnly('myntra', 'Myntra', 'https://partners.myntrainfo.com'),
  partnerOnly('nykaa', 'Nykaa', 'https://www.nykaa.com/sell-on-nykaa'),
  partnerOnly('meesho', 'Meesho', 'https://supplier.meesho.com'),
  partnerOnly('blinkit', 'Blinkit', 'https://seller.blinkit.com'),
]

export const getMarketplace = (id: string) => marketplaces.find((item) => item.id === id)
