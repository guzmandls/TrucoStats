import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

interface QrCodeProps {
  value: string
  label: string
  size?: number
}

// Código QR de un texto (un enlace), dibujado como SVG: negro sobre blanco,
// con el margen que necesitan las cámaras para leerlo.
export function QrCode({ value, label, size = 220 }: QrCodeProps) {
  const { count, path } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const modules = qr.getModuleCount()
    let d = ''
    for (let row = 0; row < modules; row += 1) {
      for (let col = 0; col < modules; col += 1) {
        if (qr.isDark(row, col)) {
          d += `M${col + 4} ${row + 4}h1v1h-1z`
        }
      }
    }
    return { count: modules + 8, path: d }
  }, [value])

  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${count} ${count}`}
      shapeRendering="crispEdges"
    >
      <rect width={count} height={count} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  )
}
