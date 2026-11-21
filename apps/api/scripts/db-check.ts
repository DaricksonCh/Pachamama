/**
 * Comprueba que la base de datos local está bien creada y es segura.
 * Uso (desde la raíz): `npm run db:check`. Necesita DATABASE_URL en .env y MySQL 8.4 en marcha.
 * No forma parte de la CI (allí no hay MySQL); la CI de BD llegará con las migraciones (fase 3).
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';

for (const candidate of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];
const record = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('✖ Falta DATABASE_URL en .env');
  process.exit(1);
}

const parsed = new URL(url);
const expectedDb = parsed.pathname.slice(1);
const expectedUser = decodeURIComponent(parsed.username);

let conn: mysql.Connection | undefined;
try {
  conn = await mysql.createConnection(url);
  record('Conexión', true, `${parsed.hostname}:${parsed.port}`);

  const [[version]] = await conn.query<mysql.RowDataPacket[]>('SELECT VERSION() AS v');
  const v = String(version?.v);
  record('Versión MySQL 8.4', v.startsWith('8.4.'), v);

  const [[db]] = await conn.query<mysql.RowDataPacket[]>(
    'SELECT DEFAULT_CHARACTER_SET_NAME AS cs, DEFAULT_COLLATION_NAME AS co FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    [expectedDb],
  );
  record(`Base "${expectedDb}" existe`, Boolean(db), db ? 'sí' : 'no encontrada');
  record(
    'Juego de caracteres utf8mb4',
    db?.cs === 'utf8mb4',
    db ? `${String(db.cs)} / ${String(db.co)}` : '-',
  );

  const [[who]] = await conn.query<mysql.RowDataPacket[]>('SELECT CURRENT_USER() AS u');
  const currentUser = String(who?.u);
  record('No se usa root', !currentUser.startsWith('root@'), currentUser);
  record('Usuario esperado', currentUser.startsWith(`${expectedUser}@`), expectedUser);

  // Mínimo privilegio: ningún permiso global (solo USAGE) y permisos limitados a su base.
  const [grants] = await conn.query<mysql.RowDataPacket[]>('SHOW GRANTS');
  const grantLines = grants.map((row) => String(Object.values(row)[0]));
  const globalGrants = grantLines.filter((g) => / ON \*\.\* /.test(g) && !/^GRANT USAGE /.test(g));
  record(
    'Sin privilegios globales',
    globalGrants.length === 0,
    globalGrants.join(' | ') || 'solo USAGE',
  );
  record(
    'Permisos sobre su base',
    grantLines.some((g) => g.includes(`\`${expectedDb}\`.*`)),
    `${grantLines.length} grants`,
  );
  record(
    'Sin GRANT OPTION',
    !grantLines.some((g) => /WITH GRANT OPTION/.test(g)),
    'no puede repartir permisos',
  );

  // Puede crear y borrar tablas (lo necesitan las migraciones).
  await conn.query('CREATE TABLE IF NOT EXISTS __db_check (id INT PRIMARY KEY)');
  await conn.query('DROP TABLE __db_check');
  record('Puede crear/borrar tablas (migraciones)', true, 'CREATE + DROP');

  // No puede tocar otras bases.
  try {
    await conn.query('SELECT 1 FROM mysql.user LIMIT 1');
    record('Aislado de otras bases', false, 'puede leer mysql.user');
  } catch {
    record('Aislado de otras bases', true, 'sin acceso a mysql.*');
  }
} catch (err) {
  record('Conexión', false, err instanceof Error ? err.message : String(err));
} finally {
  await conn?.end();
}

for (const c of checks) console.log(`${c.ok ? '✔' : '✖'} ${c.name} — ${c.detail}`);
const failed = checks.filter((c) => !c.ok).length;
console.log(failed ? `\n${failed} comprobación(es) fallida(s).` : '\nBase de datos OK.');
process.exit(failed ? 1 : 0);
