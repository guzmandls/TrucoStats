/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16)),
  },
  server: {
    // En desarrollo, las rutas /api van al Worker que corre con `npx wrangler dev`.
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    // Con todos los archivos en paralelo, algunos tests de pantalla tardan más
    // de los 5 s por defecto aunque solos tarden ~1 s.
    testTimeout: 15000,
  },
})
