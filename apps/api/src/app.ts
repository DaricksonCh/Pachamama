import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { auth } from './auth/auth';
import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler } from './middlewares/error-handler';
import { notFound } from './middlewares/not-found';
import { apiV1Router } from './routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(pinoHttp({ logger }));

  // Better Auth va ANTES de express.json(): lee el cuerpo de la petición por su cuenta.
  app.all('/api/auth/*splat', toNodeHandler(auth));

  app.use(express.json({ limit: '100kb' }));

  app.use('/api/v1', apiV1Router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
