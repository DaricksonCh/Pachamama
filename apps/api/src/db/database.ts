import { CamelCasePlugin, Kysely, MysqlDialect } from 'kysely';
import { createPool } from 'mysql2';
import { env } from '../config/env';
import type { Database } from './types';

/**
 * Crea una conexión Kysely sobre un pool de mysql2.
 * - timezone 'Z': las fechas se guardan y leen en UTC (convención del proyecto).
 * - CamelCasePlugin: camelCase en TypeScript ↔ snake_case en MySQL.
 * - El pool no abre conexiones hasta la primera consulta.
 */
export function createDatabase(url: string = env.DATABASE_URL) {
  const pool = createPool({
    uri: url,
    timezone: 'Z',
    dateStrings: false,
    connectionLimit: 10,
    charset: 'utf8mb4_0900_ai_ci',
  });

  return new Kysely<Database>({
    dialect: new MysqlDialect({ pool }),
    plugins: [new CamelCasePlugin()],
  });
}

export const db = createDatabase();
