const channel = (hex: string, index: number) =>
  Number.parseInt(hex.slice(index, index + 2), 16) / 255

const linear = (value: number) =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4

const relativeLuminance = (hex: string) => {
  const r = linear(channel(hex, 1))
  const g = linear(channel(hex, 3))
  const b = linear(channel(hex, 5))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrastRatio = (foreground: string, background: string) => {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

// Text on the brand accent must stay readable for any sampled logo color.
export const onAccentColor = (accent: string, ink: string) =>
  contrastRatio('#ffffff', accent) >= contrastRatio(ink, accent) ? '#ffffff' : ink
