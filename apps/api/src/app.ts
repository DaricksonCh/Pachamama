import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
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

  // Fase 3: Better Auth se monta AQUÍ, antes de express.json():
  // app.all('/api/auth/*splat', toNodeHandler(auth));

  app.use(express.json({ limit: '100kb' }));

  app.use('/api/v1', apiV1Router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
