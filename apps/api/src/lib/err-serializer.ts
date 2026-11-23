/**
 * Serializador de errores para pino (DSGVO).
 * Los errores de mysql2 llevan `sql` y `sqlMessage` con datos interpolados (email, nombre),
 * y `message` puede citarlos: solo se registran tipo y códigos. La traza (que empieza con el
 * mensaje) solo se incluye en desarrollo.
 */
export function createErrSerializer(includeStack: boolean) {
  return (err: unknown): Record<string, unknown> => {
    if (typeof err !== 'object' || err === null) return { type: typeof err };
    const { code, errno, sqlState } = err as {
      code?: unknown;
      errno?: unknown;
      sqlState?: unknown;
    };
    const stack = (err as { stack?: unknown }).stack;
    return {
      type: err.constructor?.name ?? 'Object',
      ...(typeof code === 'string' || typeof code === 'number' ? { code } : {}),
      ...(typeof errno === 'number' ? { errno } : {}),
      ...(typeof sqlState === 'string' ? { sqlState } : {}),
      ...(includeStack && typeof stack === 'string' ? { stack } : {}),
    };
  };
}
