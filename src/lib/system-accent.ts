import { colord } from 'colord'

export const DEFAULT_ACCENT_HEX = '#0078d4'

const LIGHT_FOREGROUND = '210 40% 98%'
const DARK_FOREGROUND = '222.2 47.4% 11.2%'

type HslTriplet = {
  h: number
  s: number
  l: number
}

export type SystemAccentPalette = {
  accentHex: string
  accentRgb: string
  cssVariables: Record<string, string>
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const normalizeHex = (hex?: string) => {
  if (!hex) {
    return DEFAULT_ACCENT_HEX
  }
  const trimmed = hex.trim().replace(/^#/, '')
  if (trimmed.length === 6 || trimmed.length === 3) {
    return `#${trimmed}`
  }
  return DEFAULT_ACCENT_HEX
}

const normalizeHsl = ({ h, s, l }: HslTriplet): HslTriplet => ({
  h: ((h % 360) + 360) % 360,
  s: clamp(s, 0, 100),
  l: clamp(l, 0, 100),
})

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

const toCssHsl = (color: HslTriplet) => {
  const normalized = normalizeHsl(color)
  return `${round(normalized.h, 1)} ${round(normalized.s, 1)}% ${round(normalized.l, 1)}%`
}

const pickForeground = (color: HslTriplet, threshold = 60) =>
  normalizeHsl(color).l > threshold ? DARK_FOREGROUND : LIGHT_FOREGROUND

const buildLightPalette = (base: HslTriplet) => {
  const primary = normalizeHsl({
    h: base.h,
    s: clamp(base.s + (base.s < 50 ? 12 : 0), 40, 88),
    l: clamp(base.l + (base.l < 50 ? 10 : base.l > 62 ? -8 : 0), 42, 60),
  })

  const ring = normalizeHsl({
    h: primary.h,
    s: clamp(primary.s + 6, 45, 92),
    l: clamp(primary.l + 6, 46, 68),
  })

  const secondary = normalizeHsl({
    h: primary.h,
    s: clamp(primary.s * 0.38, 18, 55),
    l: clamp(primary.l + 28, 70, 92),
  })

  const accent = normalizeHsl({
    h: primary.h,
    s: clamp(primary.s * 0.32, 16, 50),
    l: clamp(primary.l + 32, 78, 96),
  })

  return {
    primary: toCssHsl(primary),
    primaryForeground: pickForeground(primary),
    ring: toCssHsl(ring),
    secondary: toCssHsl(secondary),
    secondaryForeground: pickForeground(secondary),
    accent: toCssHsl(accent),
    accentForeground: pickForeground(accent),
  }
}

const buildDarkPalette = (base: HslTriplet) => {
  const primary = normalizeHsl({
    h: base.h,
    s: clamp(base.s + (base.s < 55 ? 18 : 6), 48, 92),
    l: clamp(base.l + (base.l < 55 ? 16 : -12), 50, 68),
  })

  const ring = normalizeHsl({
    h: primary.h,
    s: clamp(primary.s + 4, 50, 95),
    l: clamp(primary.l + 6, 54, 76),
  })

  const secondary = normalizeHsl({
    h: primary.h,
    s: clamp(primary.s * 0.46, 22, 62),
    l: clamp(primary.l - 24, 24, 38),
  })

  const accent = normalizeHsl({
    h: primary.h,
    s: clamp(primary.s * 0.58, 26, 72),
    l: clamp(primary.l - 14, 32, 48),
  })

  return {
    primary: toCssHsl(primary),
    primaryForeground: pickForeground(primary, 58),
    ring: toCssHsl(ring),
    secondary: toCssHsl(secondary),
    secondaryForeground: pickForeground(secondary, 52),
    accent: toCssHsl(accent),
    accentForeground: pickForeground(accent, 52),
  }
}

export const createSystemAccentPalette = (hex?: string): SystemAccentPalette => {
  const accent = colord(normalizeHex(hex))
  const resolved = accent.isValid() ? accent : colord(DEFAULT_ACCENT_HEX)
  const accentHex = resolved.toHex().toLowerCase()
  const { r, g, b } = resolved.toRgb()
  const accentRgb = `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`

  const base = resolved.toHsl()
  const light = buildLightPalette(base)
  const dark = buildDarkPalette(base)

  return {
    accentHex,
    accentRgb,
    cssVariables: {
      '--system-accent-rgb': accentRgb,
      '--system-light-primary': light.primary,
      '--system-light-primary-foreground': light.primaryForeground,
      '--system-light-ring': light.ring,
      '--system-light-secondary': light.secondary,
      '--system-light-secondary-foreground': light.secondaryForeground,
      '--system-light-accent': light.accent,
      '--system-light-accent-foreground': light.accentForeground,
      '--system-dark-primary': dark.primary,
      '--system-dark-primary-foreground': dark.primaryForeground,
      '--system-dark-ring': dark.ring,
      '--system-dark-secondary': dark.secondary,
      '--system-dark-secondary-foreground': dark.secondaryForeground,
      '--system-dark-accent': dark.accent,
      '--system-dark-accent-foreground': dark.accentForeground,
    },
  }
}
