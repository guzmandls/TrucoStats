import { useEffect, useState, type RefObject } from 'react'

export function useRowSnap(
  ref: RefObject<HTMLElement | null>,
  rows: number,
): number {
  const [top, setTop] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') {
      return
    }

    const update = () => {
      const rowHeight =
        parseFloat(
          getComputedStyle(element).getPropertyValue('--row-height'),
        ) || 40
      const available = Math.floor(element.clientHeight / rowHeight)
      const start = Math.max(0, Math.floor((available - rows) / 2))
      setTop(start * rowHeight)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, rows])

  return top
}
