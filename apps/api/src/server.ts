import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';

const app = createApp();

const onListening = () => {
  logger.info(`API listening on http://${env.API_HOST ?? 'localhost'}:${env.API_PORT}`);
};

// En producción API_HOST=127.0.0.1: la API no es accesible directamente desde internet.
const server = env.API_HOST
  ? app.listen(env.API_PORT, env.API_HOST, onListening)
  : app.listen(env.API_PORT, onListening);

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
