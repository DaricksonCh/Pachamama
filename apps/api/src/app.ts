import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { auth } from './auth/auth';
import { env } from './config/env';
import { httpLogSerializers } from './lib/http-log';
import { logger } from './lib/logger';
import { normalizeClientIp } from './middlewares/client-ip';
import { csrfProtection } from './middlewares/csrf';
import { errorHandler } from './middlewares/error-handler';
import { notFound } from './middlewares/not-found';
import { apiV1Router } from './routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Solo se confía en X-Forwarded-For si viene de un proxy de confianza (nginx local por defecto).
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(
    pinoHttp({
      logger,
      // DSGVO: los logs de peticiones no guardan IP, user agent ni cabeceras (datos personales).
      serializers: httpLogSerializers,
    }),
  );

  // Las respuestas de la API pueden llevar datos personales: nunca en cachés compartidas.
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Better Auth va ANTES de express.json(): lee el cuerpo de la petición por su cuenta.
  app.all('/api/auth/*splat', normalizeClientIp, toNodeHandler(auth));

  // Fotos de la carta: URLs inmutables (UUID nuevo en cada subida) → caché de 1 año; sin listados ni dotfiles.
  app.use(
    '/uploads',
    express.static(env.UPLOADS_DIR, {
      immutable: true,
      maxAge: '1y',
      index: false,
      dotfiles: 'deny',
    }),
  );

  app.use(express.json({ limit: '100kb' }));

  app.use('/api/v1', csrfProtection, apiV1Router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
