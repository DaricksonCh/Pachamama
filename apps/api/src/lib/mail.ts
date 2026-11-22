import { env } from '../config/env';
import { createMemoryMailer, createSmtpMailer, type Mailer } from './mailer';

/** Buzón en memoria: es el `mailer` en tests (se inspecciona con `sent` y `failNext()`). */
export const testMailer = createMemoryMailer();

export const mailer: Mailer =
  env.NODE_ENV === 'test'
    ? testMailer
    : createSmtpMailer({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
        from: env.MAIL_FROM,
      });
