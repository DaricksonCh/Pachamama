import { kyselyAdapter } from '@better-auth/kysely-adapter';
import { DEFAULT_ROLE, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@pachamama/shared';
import type { Kysely } from 'kysely';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins/admin';
import { env } from '../config/env';
import { db as defaultDb } from '../db/database';
import type { Database } from '../db/types';
import { logger } from '../lib/logger';
import { ac, roles } from './permissions';

/**
 * Autenticación del personal (panel /admin). Sin registro público: los usuarios los crea un admin.
 * Montada en /api/auth (ver app.ts). Tablas en plural/snake_case con nuestras migraciones (ADR 0007).
 */
export function createAuth(db: Kysely<Database> = defaultDb) {
  return betterAuth({
    appName: 'Pachamama',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.WEB_ORIGIN],
    database: kyselyAdapter(db, { type: 'mysql', usePlural: true, transaction: true }),

    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      autoSignIn: false,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 días
      updateAge: 60 * 60 * 24, // se renueva una vez al día si hay actividad
      freshAge: 60 * 60, // acciones sensibles exigen login de la última hora
    },

    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 }, // fuerza bruta: 5 intentos por minuto e IP
      },
    },

    advanced: {
      cookiePrefix: 'pachamama',
      // Explícito: Better Auth desactiva estas comprobaciones por defecto cuando NODE_ENV=test,
      // y queremos que los tests prueben exactamente la protección de producción.
      disableOriginCheck: false,
      disableCSRFCheck: false,
      useSecureCookies: env.NODE_ENV === 'production',
      // En producción el proxy (nginx) debe sobrescribir X-Forwarded-For con la IP real.
      ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
    },

    plugins: [admin({ ac, roles, defaultRole: DEFAULT_ROLE, adminRoles: ['admin'] })],

    databaseHooks: {
      session: {
        create: {
          // Auditoría mínima (DSGVO): solo el id del usuario, sin email ni IP en los logs.
          after: async (session) => {
            logger.info({ userId: session.userId }, 'auth.session.created');
          },
        },
      },
    },
  });
}

export const auth = createAuth();
export type Auth = typeof auth;
export type AuthSession = Auth['$Infer']['Session'];
