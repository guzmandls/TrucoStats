# TrucoStats

PWA para contar puntos de truco uruguayo, guardar partidas y consultar estadísticas.

## Tecnologías

- React + TypeScript (con Vite)
- CSS Modules
- Vitest + Testing Library
- Prettier + ESLint
- PWA / offline con IndexedDB y Service Worker
- Cloudflare Workers (hosting) y D1 (pendiente)

## Requisitos

- Node.js

## Comandos

- `npm install` — instala dependencias
- `npm run dev` — entorno de desarrollo
- `npm run build` — build de producción
- `npm run preview` — previsualiza el build
- `npm run lint` — analiza el código con ESLint
- `npm run format` — formatea con Prettier
- `npm test` — pruebas en modo watch
- `npm run test:run` — ejecuta las pruebas una vez
- `npm run deploy` — compila y publica en Cloudflare

## Despliegue

1. `npx wrangler login` — inicia sesión en Cloudflare (una sola vez).
2. `npm run deploy` — compila y publica; devuelve la URL pública.
