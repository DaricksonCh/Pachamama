import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { e2eEnv } from './fixtures';

/** Antes de los e2e: BD de tests migrada, vacía y con los usuarios de prueba. */
export default function globalSetup() {
  execSync('npm run e2e:seed -w @pachamama/api', {
    cwd: resolve(import.meta.dirname, '../../..'),
    env: { ...process.env, ...e2eEnv() },
    stdio: 'inherit',
  });
}
