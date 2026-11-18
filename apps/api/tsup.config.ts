import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // El paquete compartido se publica como TypeScript: se incluye dentro del bundle.
  noExternal: ['@pachamama/shared'],
});
