const STOPS: { at: number; rgb: [number, number, number] }[] = [
  { at: 0, rgb: [0xef, 0x44, 0x44] },
  { at: 31, rgb: [0xf5, 0x9e, 0x0b] },
  { at: 36, rgb: [0xe3, 0xd8, 0x67] },
  { at: 45, rgb: [0xdc, 0xe3, 0x83] },
  { at: 46, rgb: [0xdf, 0xdf, 0x7e] },
  { at: 48, rgb: [0xd7, 0xdf, 0x83] },
  { at: 49, rgb: [0xcc, 0xe0, 0x8a] },
  { at: 50, rgb: [0xb9, 0xe1, 0x95] },
  { at: 51, rgb: [0xb2, 0xe3, 0x9a] },
  { at: 85, rgb: [0x22, 0xc5, 0x5e] },
  { at: 100, rgb: [0x15, 0x80, 0x3d] },
]

function toHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0')
}

export function winRateColor(percent: number): string {
  const value = Math.min(100, Math.max(0, percent))

  let lower = STOPS[0]
  let upper = STOPS[STOPS.length - 1]
  for (let i = 0; i < STOPS.length - 1; i += 1) {
    if (value >= STOPS[i].at && value <= STOPS[i + 1].at) {
      lower = STOPS[i]
      upper = STOPS[i + 1]
      break
    }
  }

  const span = upper.at - lower.at
  const ratio = span === 0 ? 0 : (value - lower.at) / span
  const rgb = lower.rgb.map(
    (channel, index) => channel + (upper.rgb[index] - channel) * ratio,
  ) as [number, number, number]

  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`
}
