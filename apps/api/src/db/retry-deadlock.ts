/** MySQL: ER_LOCK_DEADLOCK (1213) y ER_LOCK_WAIT_TIMEOUT (1205) se resuelven repitiendo la transacción. */
const RETRYABLE_ERRNO = new Set([1213, 1205]);

export function isRetryableLockError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errno' in err &&
    typeof err.errno === 'number' &&
    RETRYABLE_ERRNO.has(err.errno)
  );
}

/** Ejecuta `fn` (una transacción completa) y la repite con pequeña espera si MySQL aborta por deadlock. */
export async function withDeadlockRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts || !isRetryableLockError(err)) throw err;
      await new Promise((r) => setTimeout(r, 10 * attempt + Math.random() * 20));
    }
  }
}
