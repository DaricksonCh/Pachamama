/** Safe to log: error code or class name only. Never the message (may quote an email address). */
export function safeErrorCode(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const { code, responseCode } = err as { code?: unknown; responseCode?: unknown };
    if (typeof code === 'string' || typeof code === 'number') return String(code);
    if (typeof responseCode === 'string' || typeof responseCode === 'number') {
      return String(responseCode);
    }
    if (err.constructor?.name) return err.constructor.name;
  }
  return 'UNKNOWN';
}
