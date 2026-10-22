import { useState } from 'react'

// Guarda qué trazo se acaba de agregar para animarlo: solo cuando los puntos
// suben de a uno (no al abrir una partida ya empezada ni al deshacer).
export function useJustDrawn(points: number): number | null {
  const [previous, setPrevious] = useState(points)
  const [justDrawn, setJustDrawn] = useState<number | null>(null)
  if (points !== previous) {
    setPrevious(points)
    setJustDrawn(points === previous + 1 ? points : null)
  }
  return justDrawn
}
