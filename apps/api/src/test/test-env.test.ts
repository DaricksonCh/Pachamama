import { describe, expect, it } from 'vitest';
import { assertConnectedToTestDatabase } from './db-helpers';
import { assertTestDatabaseName, resolveTestDatabaseUrl } from './test-env';

const LOCAL_ENV = 'DATABASE_URL=mysql://app:secret@127.0.0.1:3307/pachamama\n';

describe('protección de la BD real en los tests', () => {
  it('sin TEST_DATABASE_URL usa la base del .env renombrada a pachamama_test', () => {
    const url = resolveTestDatabaseUrl({}, () => LOCAL_ENV);
    expect(new URL(url).pathname).toBe('/pachamama_test');
    expect(new URL(url).port).toBe('3307');
  });

  it.each([
    'mysql://app:x@127.0.0.1:3307/pachamama',
    'mysql://app:x@127.0.0.1:3307/pachamama_testing',
    'mysql://app:x@127.0.0.1:3307/test_pachamama',
    'mysql://app:x@127.0.0.1:3307/',
  ])('aborta con una base que no termina en _test: %s', (url) => {
    expect(() => resolveTestDatabaseUrl({ TEST_DATABASE_URL: url }, () => undefined)).toThrow(
      /no termina en _test/,
    );
  });

  it('acepta una base *_test, también con parámetros en la URL', () => {
    const url = 'mysql://app:x@127.0.0.1:3306/pachamama_test?ssl=false';
    expect(resolveTestDatabaseUrl({ TEST_DATABASE_URL: url }, () => undefined)).toBe(url);
  });

  it('falla de forma clara si no hay ninguna BD configurada', () => {
    expect(() => resolveTestDatabaseUrl({}, () => undefined)).toThrow(/TEST_DATABASE_URL/);
  });

  it('assertTestDatabaseName rechaza null y nombres reales', () => {
    expect(() => assertTestDatabaseName(null)).toThrow();
    expect(() => assertTestDatabaseName('pachamama')).toThrow();
    expect(() => assertTestDatabaseName('pachamama_test')).not.toThrow();
  });

  it('la conexión de los tests está realmente en una base *_test', async () => {
    await expect(assertConnectedToTestDatabase()).resolves.toBeUndefined();
  });
});
