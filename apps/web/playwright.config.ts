import { defineConfig, devices } from '@playwright/test';
import { E2E_API_PORT, E2E_WEB_PORT } from './e2e/fixtures';

const isCI = Boolean(process.env.CI);
const webURL = `http://localhost:${E2E_WEB_PORT}`;

/**
 * Tests end-to-end: flujos de usuario reales en el navegador.
 * Levantan su PROPIA API (3100) y web (5174) contra la BD `pachamama_test`,
 * así nunca tocan la BD de desarrollo ni chocan con `npm run dev`.
 * Ejecutar desde la raíz: `npm run test:e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: webURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'npm run e2e:serve -w @pachamama/api',
      cwd: '../..',
      url: `http://localhost:${E2E_API_PORT}/api/v1/health`,
      env: {
        E2E_API_PORT: String(E2E_API_PORT),
        E2E_WEB_ORIGIN: webURL,
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npm run dev -w @pachamama/web -- --port ${E2E_WEB_PORT} --strictPort`,
      cwd: '../..',
      url: webURL,
      env: { API_PROXY_TARGET: `http://localhost:${E2E_API_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
