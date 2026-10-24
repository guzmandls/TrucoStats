// El manifiesto de la app instalada (nombre, íconos, colores y dónde arranca).
// Lo sirve el Worker para poder entregar uno propio por invitación: instalada
// desde un enlace de invitación, la app arranca en esa invitación (si no, la
// persona perdería el enlace al pasar de Safari a la app instalada).
const INVITE_CODE = /^[0-9a-f]{32}$/

function manifest(startUrl: string) {
  return {
    // Mismo id para todos: es la misma app aunque arranque en otra dirección.
    id: '/',
    name: 'trucoStats',
    short_name: 'trucoStats',
    description: 'Contador de puntos de truco uruguayo con estadísticas.',
    lang: 'es',
    start_url: startUrl,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#1c1c1c',
    theme_color: '#1c1c1c',
    icons: [
      { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

function manifestResponse(startUrl: string): Response {
  return new Response(JSON.stringify(manifest(startUrl)), {
    headers: {
      'content-type': 'application/manifest+json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

// El de siempre: arranca en el inicio.
export function appManifest(): Response {
  return manifestResponse('/')
}

// El de una invitación: arranca en `/unirse/<código>`. Con un código inválido,
// el de siempre.
export function inviteManifest(code: string): Response {
  return manifestResponse(INVITE_CODE.test(code) ? `/unirse/${code}` : '/')
}
