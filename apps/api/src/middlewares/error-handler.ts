import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../lib/app-error';
import { logger } from '../lib/logger';

/** Errores que lanza express.json() (body-parser) ante peticiones mal formadas. */
const BODY_PARSER_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  'entity.parse.failed': { status: 400, code: 'INVALID_JSON', message: 'Malformed JSON body' },
  'entity.too.large': { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' },
  'encoding.unsupported': {
    status: 415,
    code: 'UNSUPPORTED_ENCODING',
    message: 'Unsupported content encoding',
  },
};

function bodyParserError(err: unknown) {
  if (typeof err === 'object' && err !== null && 'type' in err && typeof err.type === 'string') {
    return BODY_PARSER_ERRORS[err.type];
  }
  return undefined;
}

/** Formato uniforme de error: { error: { code, message, details? } }. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Errores del cliente (JSON roto, cuerpo enorme): 4xx sin filtrar detalles internos.
  const clientError = bodyParserError(err);
  if (clientError) {
    res.status(clientError.status).json({
      error: { code: clientError.code, message: clientError.message },
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
