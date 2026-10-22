import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

// Genera los íconos de la app (public/*.png y favicon.ico) a partir de
// public/app-icon.svg. Se corre con `npm run icons` cada vez que cambia el ícono.
// El diseño ya es un cuadrado negro de borde a borde, así que los íconos comunes
// no llevan margen. El "maskable" (Android) sí: Android lo recorta en círculo u
// otras formas y solo respeta el 80% del centro, así que el dibujo se achica y
// se completa con el mismo negro.
const ink = '#1c1c1c'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0.35,
      resizeOptions: { background: ink },
    },
    apple: {
      ...minimal2023Preset.apple,
      padding: 0,
      resizeOptions: { background: ink },
    },
  },
  images: ['public/app-icon.svg'],
})
