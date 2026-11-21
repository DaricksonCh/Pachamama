import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../lib/app-error';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ALLOWED_BODY_TYPES = ['application/json', 'multipart/form-data'];

function normalizeOrigin(value: string): string | null {
  try {
    const origin = new URL(value).origin;
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
}

/** Pura para poder probarla: si el origen permitido no se puede normalizar, se rechaza todo (fail closed). */
export function isAllowedOrigin(origin: string, allowed: string | null): boolean {
  return allowed !== null && normalizeOrigin(origin) === allowed;
}

function reject(): never {
  throw new AppError(403, 'CSRF_REJECTED', 'Request origin not allowed');
}

/**
 * Protección CSRF de /api/v1 para métodos que modifican datos.
 * - Origin debe coincidir con WEB_ORIGIN; sin Origin solo vale Sec-Fetch-Site: same-origin.
 * - Si hay cuerpo, Content-Type debe ser JSON o multipart (un formulario cross-site no puede enviarlos sin preflight).
 */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (origin !== undefined) {
    if (!isAllowedOrigin(origin, normalizeOrigin(env.WEB_ORIGIN))) reject();
  } else if (
    // Sin Origin (algunas peticiones same-origin no lo envían): el navegador garantiza Fetch Metadata.
    req.headers['sec-fetch-site'] !== 'same-origin'
  ) {
    reject();
  }

  const length = req.headers['content-length'];
  const hasBody = (length !== undefined && length !== '0') || !!req.headers['transfer-encoding'];
  if (hasBody) {
    const type = (req.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase();
    if (!ALLOWED_BODY_TYPES.includes(type)) reject();
  }

  next();
};
