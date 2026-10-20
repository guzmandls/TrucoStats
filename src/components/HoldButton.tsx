import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent,
  type ReactNode,
} from 'react'

interface HoldButtonProps {
  onStart: () => void
  onEnd: () => void
  disabled?: boolean
  className?: string
  ariaLabel?: string
  children: ReactNode
}

const HOLD_DELAY = 300
const MAX_INTERVAL = 150
const MIN_INTERVAL = 50
const ACCELERATION = 4

export function HoldButton({
  onStart,
  onEnd,
  disabled = false,
  className,
  ariaLabel,
  children,
}: HoldButtonProps) {
  const holdTimeout = useRef<number | null>(null)
  const repeatTimeout = useRef<number | null>(null)
  const delay = useRef(MAX_INTERVAL)
  const pressed = useRef(false)
  const onStartRef = useRef(onStart)
  const onEndRef = useRef(onEnd)
  const repeatRef = useRef<() => void>(() => {})

  useEffect(() => {
    onStartRef.current = onStart
    onEndRef.current = onEnd
  })

  useEffect(() => {
    repeatRef.current = () => {
      onStartRef.current()
      delay.current = Math.max(MIN_INTERVAL, delay.current - ACCELERATION)
      repeatTimeout.current = window.setTimeout(() => {
        repeatRef.current()
      }, delay.current)
    }
  }, [])

  const clearTimers = useCallback(() => {
    if (holdTimeout.current !== null) {
      window.clearTimeout(holdTimeout.current)
      holdTimeout.current = null
    }
    if (repeatTimeout.current !== null) {
      window.clearTimeout(repeatTimeout.current)
      repeatTimeout.current = null
    }
  }, [])

  const stop = useCallback(() => {
    if (!pressed.current) {
      return
    }
    pressed.current = false
    clearTimers()
    onEndRef.current()
  }, [clearTimers])

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (disabled) {
        return
      }
      event.preventDefault()
      pressed.current = true
      delay.current = MAX_INTERVAL
      onStartRef.current()
      holdTimeout.current = window.setTimeout(() => {
        repeatRef.current()
      }, HOLD_DELAY)
    },
    [disabled],
  )

  useEffect(() => {
    if (disabled && pressed.current) {
      stop()
    }
  }, [disabled, stop])

  useEffect(() => clearTimers, [clearTimers])

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      {children}
    </button>
  )
}
