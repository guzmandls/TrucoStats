const PALETTE_SIZE = 16
// 7 y 16 son coprimos: al saltar de 7 en 7 se recorren los 16 colores sin
// repetir, y los primeros integrantes quedan con tonos bien separados.
const COLOR_STEP = 7

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100
  const l = lightness / 100
  const k = (n: number) => (n + hue / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (value: number) =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(channel(0))}${toHex(channel(8))}${toHex(channel(4))}`
}

// 16 tonos repartidos por el círculo cromático; los vecinos alternan la
// luminosidad para distinguirse aun cuando el tono se parezca. Todos son lo
// bastante oscuros como para que la silueta clara se lea.
const PALETTE = Array.from({ length: PALETTE_SIZE }, (_, index) =>
  hslToHex((index * 360) / PALETTE_SIZE, 55, index % 2 === 0 ? 38 : 46),
)

function hash(value: string): number {
  let result = 0
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0
  }
  return result
}

export function avatarColor(id: string): string {
  return PALETTE[hash(id) % PALETTE_SIZE]
}

/**
 * Color por defecto de cada integrante de un grupo, según su posición en la
 * lista: dentro del grupo no se repite ningún color (hasta 16 integrantes) y
 * los primeros quedan con tonos bien distintos. Agregar integrantes al final
 * no cambia el color de los anteriores.
 */
export function avatarColors(ids: string[]): Record<string, string> {
  const colors: Record<string, string> = {}
  ids.forEach((id, position) => {
    colors[id] = PALETTE[(position * COLOR_STEP) % PALETTE_SIZE]
  })
  return colors
}
