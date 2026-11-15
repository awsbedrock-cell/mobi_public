import { BLACK, WHITE, hexToRgb, luminance, mix, onColor, triplet, type Rgb } from './color'

/*
 * Branding registry. Everything the brand UI offers (industry presets, font
 * pairings, button / navigation / card styles) is data in this file, so new
 * options appear in the app without touching any component.
 */

export type ButtonStyle = 'rounded' | 'pill' | 'square'
export type NavStyle = 'filled' | 'soft' | 'line'
export type CardStyle = 'elevated' | 'outlined' | 'flat'

export interface BrandStyle {
  primary: string
  secondary: string
  accent: string
  /** Optional primary for dark mode; derived from `primary` when omitted. */
  darkPrimary?: string
  font: string
  button: ButtonStyle
  nav: NavStyle
  card: CardStyle
}

export interface FontPairing {
  id: string
  label: string
  heading: string
  body: string
  /** Google Fonts `family=` query; omitted for system fonts. */
  google?: string
}

const fallback = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

export const fontPairings: FontPairing[] = [
  { id: 'jakarta', label: 'Plus Jakarta Sans', heading: `'Plus Jakarta Sans', ${fallback}`, body: `'Plus Jakarta Sans', ${fallback}` },
  { id: 'inter', label: 'Inter', heading: `'Inter', ${fallback}`, body: `'Inter', ${fallback}`, google: 'family=Inter:wght@400;500;600;700;800' },
  { id: 'poppins', label: 'Poppins', heading: `'Poppins', ${fallback}`, body: `'Poppins', ${fallback}`, google: 'family=Poppins:wght@400;500;600;700;800' },
  { id: 'nunito', label: 'Nunito', heading: `'Nunito', ${fallback}`, body: `'Nunito', ${fallback}`, google: 'family=Nunito:wght@400;500;600;700;800' },
  { id: 'manrope', label: 'Manrope', heading: `'Manrope', ${fallback}`, body: `'Manrope', ${fallback}`, google: 'family=Manrope:wght@400;500;600;700;800' },
  { id: 'playfair-dmsans', label: 'Playfair Display + DM Sans', heading: "'Playfair Display', Georgia, serif", body: `'DM Sans', ${fallback}`, google: 'family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800' },
  { id: 'cormorant-inter', label: 'Cormorant Garamond + Inter', heading: "'Cormorant Garamond', Georgia, serif", body: `'Inter', ${fallback}`, google: 'family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;500;600;700' },
  { id: 'space-inter', label: 'Space Grotesk + Inter', heading: `'Space Grotesk', ${fallback}`, body: `'Inter', ${fallback}`, google: 'family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700' },
]

export const buttonStyles: Array<{ id: ButtonStyle; label: string }> = [
  { id: 'rounded', label: 'Rounded' },
  { id: 'pill', label: 'Pill' },
  { id: 'square', label: 'Sharp' },
]

export const navStyles: Array<{ id: NavStyle; label: string; active: string }> = [
  { id: 'filled', label: 'Filled', active: 'bg-primary text-primary-fg shadow-brand' },
  { id: 'soft', label: 'Soft tint', active: 'bg-primary-soft text-primary' },
  { id: 'line', label: 'Accent line', active: 'rounded-none text-primary shadow-[inset_3px_0_0_rgb(var(--color-primary))]' },
]

export const cardStyles: Array<{ id: CardStyle; label: string }> = [
  { id: 'elevated', label: 'Elevated' },
  { id: 'outlined', label: 'Outlined' },
  { id: 'flat', label: 'Flat' },
]

export interface BrandPreset {
  id: string
  name: string
  industry: string
  description: string
  style: BrandStyle
}

export const SIGNATURE_PRESET = 'signature'

export const brandPresets: BrandPreset[] = [
  {
    id: SIGNATURE_PRESET,
    name: 'Mobi Signature',
    industry: 'Mobile Retail',
    description: 'The original Mobi purple with soft cards and filled navigation.',
    style: { primary: '#7c3aed', secondary: '#4f46e5', accent: '#f59e0b', font: 'jakarta', button: 'rounded', nav: 'filled', card: 'elevated' },
  },
  {
    id: 'retail',
    name: 'Retail & E-commerce',
    industry: 'Retail & E-commerce',
    description: 'Energetic orange with friendly pill buttons, built for offers and fast checkout.',
    style: { primary: '#ea580c', secondary: '#0f766e', accent: '#facc15', font: 'poppins', button: 'pill', nav: 'filled', card: 'elevated' },
  },
  {
    id: 'electronics',
    name: 'Electronics & Technology',
    industry: 'Electronics & Technology',
    description: 'Confident blue, crisp outlines and a technical typeface.',
    style: { primary: '#2563eb', secondary: '#0891b2', accent: '#22d3ee', font: 'space-inter', button: 'rounded', nav: 'soft', card: 'outlined' },
  },
  {
    id: 'fashion',
    name: 'Fashion & Lifestyle',
    industry: 'Fashion & Lifestyle',
    description: 'Editorial serif headings, rose accents and sharp, magazine-like edges.',
    style: { primary: '#be185d', secondary: '#7e22ce', accent: '#fb7185', font: 'playfair-dmsans', button: 'square', nav: 'line', card: 'flat' },
  },
  {
    id: 'grocery',
    name: 'Grocery & Supermarket',
    industry: 'Grocery & Supermarket',
    description: 'Fresh green with warm orange highlights and rounded, approachable shapes.',
    style: { primary: '#15803d', secondary: '#65a30d', accent: '#f97316', font: 'nunito', button: 'pill', nav: 'soft', card: 'elevated' },
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Pharmacy',
    industry: 'Healthcare & Pharmacy',
    description: 'Calm clinical teal, clear outlines and highly legible type.',
    style: { primary: '#0d9488', secondary: '#0369a1', accent: '#38bdf8', font: 'manrope', button: 'rounded', nav: 'soft', card: 'outlined' },
  },
  {
    id: 'luxury',
    name: 'Luxury & Premium Retail',
    industry: 'Luxury & Premium Retail',
    description: 'Black and gold with elegant serif headings and restrained, sharp detailing.',
    style: { primary: '#1c1917', darkPrimary: '#d4af37', secondary: '#78716c', accent: '#b8891f', font: 'cormorant-inter', button: 'square', nav: 'line', card: 'outlined' },
  },
  {
    id: 'minimal',
    name: 'Minimal & Modern Business',
    industry: 'Minimal & Modern Business',
    description: 'Neutral monochrome with a single indigo accent and flat surfaces.',
    style: { primary: '#18181b', darkPrimary: '#f4f4f5', secondary: '#52525b', accent: '#6366f1', font: 'inter', button: 'rounded', nav: 'soft', card: 'flat' },
  },
]

export const getPreset = (id: string) => brandPresets.find((preset) => preset.id === id) ?? brandPresets[0]
export const getFont = (id: string) => fontPairings.find((font) => font.id === id) ?? fontPairings[0]
export const getNavStyle = (id: NavStyle) => navStyles.find((style) => style.id === id) ?? navStyles[0]

export const sameStyle = (a: BrandStyle, b: BrandStyle) =>
  (['primary', 'secondary', 'accent', 'darkPrimary', 'font', 'button', 'nav', 'card'] as const).every((key) => (a[key] ?? '').toString().toLowerCase() === (b[key] ?? '').toString().toLowerCase())

/** The signature style is exactly what src/styles/tokens.css defines, so it needs no overrides. */
export const isSignatureStyle = (style: BrandStyle) => sameStyle(style, brandPresets[0].style)

const shapes: Record<ButtonStyle, { button: string; control: string; card: string }> = {
  rounded: { button: '10px', control: '10px', card: '16px' },
  pill: { button: '999px', control: '12px', card: '20px' },
  square: { button: '3px', control: '4px', card: '6px' },
}

export type TokenMap = Record<string, string>

/** Derives the full token set (see src/styles/tokens.css) for a brand style in one colour mode. */
export function buildTokens(style: BrandStyle, mode: 'light' | 'dark'): TokenMap {
  const base = hexToRgb(style.primary)
  const dark = mode === 'dark'
  const font = getFont(style.font)
  const shape = shapes[style.button]
  const t: TokenMap = {}
  const set = (name: string, rgb: Rgb) => (t[`--color-${name}`] = triplet(rgb))

  let primary: Rgb
  let bg: Rgb
  let text: Rgb
  let secondary = hexToRgb(style.secondary)
  let accent = hexToRgb(style.accent)

  if (dark) {
    primary = style.darkPrimary ? hexToRgb(style.darkPrimary) : mix(base, WHITE, luminance(base) < 0.12 ? 0.32 : 0.18)
    secondary = mix(secondary, WHITE, 0.25)
    accent = mix(accent, WHITE, 0.1)
    bg = mix([11, 11, 16], base, 0.05)
    text = mix(WHITE, primary, 0.06)
    set('primary-hover', mix(primary, WHITE, 0.2))
    set('primary-active', mix(primary, WHITE, 0.45))
    set('primary-soft', mix(bg, primary, 0.2))
    set('primary-muted', mix(bg, primary, 0.36))
    set('secondary-soft', mix(bg, secondary, 0.2))
    set('accent-soft', mix(bg, accent, 0.2))
    set('bg-subtle', mix(bg, WHITE, 0.03))
    set('surface', mix(bg, WHITE, 0.055))
    set('surface-raised', mix(bg, WHITE, 0.09))
    set('surface-muted', mix(bg, WHITE, 0.1))
    set('text-inverse', bg)
    set('border', mix(bg, WHITE, 0.14))
    set('border-strong', mix(bg, WHITE, 0.24))
  } else {
    primary = base
    bg = mix(WHITE, base, 0.04)
    text = mix([17, 17, 24], base, 0.12)
    set('primary-hover', mix(primary, luminance(primary) < 0.03 ? WHITE : BLACK, 0.14))
    set('primary-active', mix(primary, luminance(primary) < 0.03 ? WHITE : BLACK, 0.28))
    set('primary-soft', mix(WHITE, primary, 0.08))
    set('primary-muted', mix(WHITE, primary, 0.22))
    set('secondary-soft', mix(WHITE, secondary, 0.1))
    set('accent-soft', mix(WHITE, accent, 0.16))
    set('bg-subtle', mix(WHITE, base, 0.07))
    set('surface', WHITE)
    set('surface-raised', WHITE)
    set('surface-muted', mix(WHITE, base, 0.025))
    set('text-inverse', WHITE)
    set('border', mix(WHITE, text, 0.1))
    set('border-strong', mix(WHITE, text, 0.2))
  }

  set('primary', primary)
  set('primary-fg', onColor(primary))
  set('secondary', secondary)
  set('secondary-fg', onColor(secondary))
  set('accent', accent)
  set('accent-fg', onColor(accent))
  set('bg', bg)
  set('text', text)
  set('text-muted', mix(text, bg, dark ? 0.32 : 0.36))
  set('text-subtle', mix(text, bg, dark ? 0.52 : 0.56))

  const shadow = dark ? '0 0 0' : triplet(mix(text, primary, 0.3))
  const elevated = dark ? `0 1px 2px rgb(0 0 0 / 0.3), 0 8px 24px -12px rgb(0 0 0 / 0.5)` : `0 1px 2px rgb(${shadow} / 0.04), 0 8px 24px -12px rgb(${shadow} / 0.14)`
  t['--shadow-card'] = style.card === 'elevated' ? elevated : 'none'
  t['--card-border'] = style.card === 'outlined' ? t['--color-border-strong'] : style.card === 'flat' ? t['--color-surface'] : t['--color-border']
  t['--shadow-pop'] = dark ? '0 12px 40px -8px rgb(0 0 0 / 0.7)' : `0 12px 40px -8px rgb(${shadow} / 0.25)`
  t['--radius-button'] = shape.button
  t['--radius-control'] = shape.control
  t['--radius-card'] = shape.card
  t['--font-sans'] = font.body
  t['--font-heading'] = font.heading
  return t
}
