import type { RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

interface RateLimiterOptions {
  windowMs: number;
  limit: number;
}

/**
 * Límite de peticiones por IP (contador en memoria: válido con un solo proceso de la API).
 * La clave es `req.ip`, que Express calcula con `trust proxy` (misma IP fiable que usa
 * Better Auth vía normalizeClientIp), así que detrás de nginx cuenta por cliente real.
 * Devuelve 429 con el formato de error estándar y cabeceras RateLimit estándar.
 */
export function createRateLimiter({ windowMs, limit }: RateLimiterOptions): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? 'unknown'),
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
      });
    },
  });
}

const MINUTE = 60_000;

/** Límite general de /api/v1. */
export const apiLimiter = (limit: number) => createRateLimiter({ windowMs: MINUTE, limit });
/** Subida de fotos de platos (multipart, procesa imágenes). */
export const imageUploadLimiter = (limit: number) =>
  createRateLimiter({ windowMs: 10 * MINUTE, limit });
/** PDF de la carta (render costoso). */
export const pdfLimiter = (limit: number) => createRateLimiter({ windowMs: MINUTE, limit });
