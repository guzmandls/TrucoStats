const MAX_SIDE = 256

// Se muestra si el navegador no puede leer el archivo (un formato que no conoce,
// un archivo dañado).
export const UNREADABLE_IMAGE =
  'No se pudo usar esa imagen. Prueba con otra foto.'

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('No se pudo procesar la imagen')
  }
  context.drawImage(bitmap, 0, 0, width, height)
  if ('close' in bitmap && typeof bitmap.close === 'function') {
    bitmap.close()
  }
  return canvas.toDataURL('image/jpeg', 0.82)
}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
  }
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    image.src = url
  })
}
