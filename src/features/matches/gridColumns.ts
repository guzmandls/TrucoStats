export const MAX_GRID_COLUMNS = 6

const MIN_GRID_COLUMNS = 3

export function gridColumns(total: number, max = MAX_GRID_COLUMNS): number {
  if (total <= 0) {
    return 1
  }
  if (total <= max) {
    return total
  }
  let best = max
  let bestDiff = Number.POSITIVE_INFINITY
  for (let cols = MIN_GRID_COLUMNS; cols <= max; cols += 1) {
    const pages = Math.ceil(total / cols)
    const last = total - (pages - 1) * cols
    const diff = Math.abs(cols - last)
    if (diff < bestDiff || (diff === bestDiff && cols > best)) {
      bestDiff = diff
      best = cols
    }
  }
  return best
}
