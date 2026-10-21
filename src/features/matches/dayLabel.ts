const MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

// Día de la partida en la hora del celular, para agrupar el historial.
export function dayKey(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

// "Hoy", "Ayer", después la fecha corta ("18 oct") y, si es de otro año,
// con el año ("18 oct 2025").
export function dayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (dayKey(iso) === dayKey(now.toISOString())) {
    return 'Hoy'
  }
  if (dayKey(iso) === dayKey(yesterday.toISOString())) {
    return 'Ayer'
  }
  const short = `${date.getDate()} ${MONTHS[date.getMonth()]}`
  return date.getFullYear() === now.getFullYear()
    ? short
    : `${short} ${date.getFullYear()}`
}
