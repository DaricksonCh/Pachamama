import { describe, expect, it } from 'vitest';
import { envSchema } from '../config/env';
import { createMemoryMailer, sanitizeSubject } from './mailer';

const msg = { to: 'a@b.de', subject: 's', text: 't', html: '<p>t</p>' };

describe('createMemoryMailer', () => {
  it('stores sent messages', async () => {
    const mailer = createMemoryMailer();
    await mailer.send(msg);
    expect(mailer.sent).toEqual([msg]);
  });

  it('failNext rejects only the next send', async () => {
    const mailer = createMemoryMailer();
    mailer.failNext();
    await expect(mailer.send(msg)).rejects.toThrow();
    expect(mailer.sent).toHaveLength(0);
    await mailer.send(msg);
    expect(mailer.sent).toHaveLength(1);
  });
});

describe('sanitizeSubject', () => {
  it('replaces CR/LF with a space', () => {
    expect(sanitizeSubject('Hi\r\nBcc: x@y.z\nmore')).toBe('Hi Bcc: x@y.z more');
  });
});

describe('env mail settings', () => {
  const base = {
    DATABASE_URL: 'mysql://u:p@127.0.0.1:3307/db',
    BETTER_AUTH_SECRET: 'x'.repeat(32),
  };
  const prod = {
    ...base,
    NODE_ENV: 'production',
    WEB_ORIGIN: 'https://pachamama.example.org',
    BETTER_AUTH_URL: 'https://pachamama.example.org',
    API_HOST: '127.0.0.1',
    SMTP_HOST: 'smtp.provider.net',
    MAIL_FROM: 'Pachamama <reservierung@pachamama-bremen.de>',
    RESERVATIONS_NOTIFY_EMAIL: 'reservierung@pachamama-bremen.de',
  };
  const issuePaths = (input: Record<string, string>) => {
    const r = envSchema.safeParse(input);
    return r.success ? [] : r.error.issues.map((i) => i.path[0]);
  };

  it('has development defaults', () => {
    const r = envSchema.parse(base);
    expect(r).toMatchObject({ SMTP_HOST: 'localhost', SMTP_PORT: 1025, SMTP_SECURE: false });
    expect(r.SMTP_USER).toBeUndefined();
  });

  it('treats empty mail variables as unset (defaults apply)', () => {
    const r = envSchema.parse({
      ...base,
      SMTP_HOST: '',
      SMTP_PORT: '',
      SMTP_SECURE: '',
      MAIL_FROM: '',
      RESERVATIONS_NOTIFY_EMAIL: '',
    });
    expect(r).toMatchObject({
      SMTP_HOST: 'localhost',
      SMTP_PORT: 1025,
      SMTP_SECURE: false,
      MAIL_FROM: 'Pachamama <reservierung@localhost>',
      RESERVATIONS_NOTIFY_EMAIL: 'reservierung@localhost',
    });
  });

  it('rejects an empty SMTP_HOST in production (falls back to localhost)', () => {
    expect(issuePaths({ ...prod, SMTP_HOST: '' })).toContain('SMTP_HOST');
  });

  it('parses SMTP_SECURE from a string', () => {
    expect(envSchema.parse({ ...base, SMTP_SECURE: 'true' }).SMTP_SECURE).toBe(true);
  });

  it('accepts a valid production config', () => {
    expect(issuePaths(prod)).toEqual([]);
  });

  it('rejects localhost SMTP in production', () => {
    expect(issuePaths({ ...prod, SMTP_HOST: 'localhost' })).toContain('SMTP_HOST');
    expect(issuePaths({ ...prod, SMTP_HOST: '127.0.0.1' })).toContain('SMTP_HOST');
  });

  it('rejects local SMTP host variants in production', () => {
    for (const host of ['LOCALHOST', '::1', '0.0.0.0', 'mail.localhost']) {
      expect(issuePaths({ ...prod, SMTP_HOST: host })).toContain('SMTP_HOST');
    }
  });

  it('requires SMTP_USER and SMTP_PASS together', () => {
    expect(issuePaths({ ...base, SMTP_PASS: 'p' })).toContain('SMTP_USER');
    expect(issuePaths({ ...base, SMTP_USER: 'u' })).toContain('SMTP_PASS');
    expect(issuePaths({ ...base, SMTP_USER: 'u', SMTP_PASS: 'p' })).toEqual([]);
  });

  it('treats empty SMTP_USER and SMTP_PASS as unset', () => {
    const r = envSchema.parse({ ...base, SMTP_USER: '', SMTP_PASS: '' });
    expect(r.SMTP_USER).toBeUndefined();
    expect(r.SMTP_PASS).toBeUndefined();
  });

  it('parses SMTP_SECURE=false and rejects invalid values', () => {
    expect(envSchema.parse({ ...base, SMTP_SECURE: 'false' }).SMTP_SECURE).toBe(false);
    expect(issuePaths({ ...base, SMTP_SECURE: 'yes' })).toContain('SMTP_SECURE');
  });

  it('rejects placeholder sender and notify addresses in production', () => {
    expect(issuePaths({ ...prod, MAIL_FROM: 'Pachamama <no-reply@example.com>' })).toContain(
      'MAIL_FROM',
    );
    expect(issuePaths({ ...prod, MAIL_FROM: 'x <a@localhost>' })).toContain('MAIL_FROM');
    expect(issuePaths({ ...prod, RESERVATIONS_NOTIFY_EMAIL: 'a@example.com' })).toContain(
      'RESERVATIONS_NOTIFY_EMAIL',
    );
  });
});
