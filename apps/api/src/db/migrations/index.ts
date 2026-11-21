import type { Migration } from 'kysely/migration';
import * as authTables from './2026_11_22_001_auth_tables';

/**
 * Registro explícito de migraciones (en orden). Se importan en lugar de leer la carpeta
 * para que funcionen también dentro del bundle de producción (tsup).
 * Regla: nunca editar una migración ya aplicada; añadir siempre una nueva al final.
 */
export const migrations: Record<string, Migration> = {
  '2026_11_22_001_auth_tables': authTables,
};
