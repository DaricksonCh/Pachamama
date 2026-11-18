import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../lib/app-error';
import { logger } from '../lib/logger';

/** Formato uniforme de error: { error: { code, message, details? } }. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      // En producción nunca se exponen detalles internos.
      message: env.NODE_ENV === 'production' ? 'Internal server error' : String(err),
    },
  });
};
