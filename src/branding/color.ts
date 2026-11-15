export type Rgb = [number, number, number]

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0')
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0) as Rgb
}

export const mix = (a: Rgb, b: Rgb, amount: number): Rgb => a.map((value, i) => Math.round(value + (b[i] - value) * amount)) as Rgb

/** "R G B" triplet, the format every color token uses. */
export const triplet = (rgb: Rgb) => rgb.join(' ')

export function luminance([r, g, b]: Rgb) {
  const channel = (value: number) => {
    const s = value / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export const WHITE: Rgb = [255, 255, 255]
export const BLACK: Rgb = [0, 0, 0]
const INK: Rgb = [17, 17, 24]

/** Readable foreground for text placed on the given color. */
export const onColor = (rgb: Rgb): Rgb => (luminance(rgb) > 0.36 ? INK : WHITE)
