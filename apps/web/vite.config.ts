import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // En desarrollo la web y la API comparten origen: /api se reenvía a Express (cookies sin CORS).
    proxy: {
      // API_PROXY_TARGET: lo usan los e2e para apuntar a su propia API de pruebas.
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Los tests e2e (Playwright) se ejecutan aparte con `npm run test:e2e`.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
