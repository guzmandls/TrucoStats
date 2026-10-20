const PALETTE = [
  '#e63946',
  '#f4a261',
  '#e9c46a',
  '#2a9d8f',
  '#457b9d',
  '#6d597a',
  '#b56576',
  '#7f5539',
  '#588157',
  '#3a5a40',
  '#c1121f',
  '#457b9d',
]

function hash(value: string): number {
  let result = 0
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0
  }
  return result
}

export function avatarColor(id: string): string {
  return PALETTE[hash(id) % PALETTE.length]
}
