# trucoStats

PWA para contar puntos de truco uruguayo, guardar partidas y consultar estadísticas.

## Tecnologías

- React + TypeScript (con Vite)
- CSS Modules
- Vitest + Testing Library
- Prettier + ESLint
- PWA / offline con IndexedDB y Service Worker
- Cloudflare Workers (servidor y hosting) y D1 (base de datos SQL)
- Brevo (correos de recuperación de contraseña)

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
- `npm run icons` — genera los íconos a partir de `public/app-icon.svg`

## Despliegue

Sitio publicado: https://trucostats.guzmandls.workers.dev

1. `npx wrangler login` — inicia sesión en Cloudflare (una sola vez).
2. Si hay migraciones nuevas en `migrations/`, aplicarlas **antes** de publicar:
   `npx wrangler d1 migrations apply trucostats-db --remote`.
3. `npm run deploy` — compila y publica; devuelve la URL pública.
4. Comprobar que responde: `/api/salud`.

## Documentación

- `docs/requisitos.md` — qué hace la app (la referencia principal).
- `docs/desarrollo.md` — diario del desarrollo: cada etapa y por qué se hizo así.
- `docs/pendientes.md` — deuda técnica, mantenimiento e ideas a futuro.
