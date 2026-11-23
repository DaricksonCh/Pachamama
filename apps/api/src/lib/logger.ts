import { pino } from 'pino';
import { env } from '../config/env';
import { createErrSerializer } from './err-serializer';

const defaultLevel =
  env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug';

export const logger = pino({
  level: env.LOG_LEVEL ?? defaultLevel,
  // No registrar datos sensibles (seguridad / DSGVO).
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
  serializers: { err: createErrSerializer(env.NODE_ENV === 'development') },
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
    },
  }),
});
