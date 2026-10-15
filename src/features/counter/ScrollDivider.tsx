import { useRef, type PointerEvent, type RefObject } from 'react'
import styles from './ScrollDivider.module.css'

interface ScrollDividerProps {
  leftRef: RefObject<HTMLDivElement | null>
  rightRef: RefObject<HTMLDivElement | null>
}

const MOVE_THRESHOLD = 6
const DOUBLE_TAP_MS = 300

export function ScrollDivider({ leftRef, rightRef }: ScrollDividerProps) {
  const drag = useRef<{
    startY: number
    leftStart: number
    rightStart: number
    moved: boolean
  } | null>(null)
  const lastTap = useRef(0)

  const scrollToLatest = () => {
    for (const element of [leftRef.current, rightRef.current]) {
      if (element) {
        element.scrollTop = element.scrollHeight
      }
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      startY: event.clientY,
      leftStart: leftRef.current?.scrollTop ?? 0,
      rightStart: rightRef.current?.scrollTop ?? 0,
      moved: false,
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state) {
      return
    }
    const delta = event.clientY - state.startY
    if (Math.abs(delta) > MOVE_THRESHOLD) {
      state.moved = true
    }
    if (!state.moved) {
      return
    }
    if (leftRef.current) {
      leftRef.current.scrollTop = state.leftStart + delta
    }
    if (rightRef.current) {
      rightRef.current.scrollTop = state.rightStart + delta
    }
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    drag.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (state && !state.moved) {
      const now = Date.now()
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        scrollToLatest()
        lastTap.current = 0
      } else {
        lastTap.current = now
      }
    }
  }

  return (
    <div
      className={styles.divider}
      role="separator"
      aria-orientation="vertical"
      aria-label="Desplazar contadores"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  )
}
