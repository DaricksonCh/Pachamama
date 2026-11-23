import nodemailer from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(msg: MailMessage): Promise<void>;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  /** STARTTLS obligatorio cuando `secure` es false (sin él, nunca se envía en claro). */
  requireTls?: boolean | undefined;
  user?: string | undefined;
  pass?: string | undefined;
  from: string;
}

/** Header injection guard: a subject must never contain line breaks. */
export function sanitizeSubject(subject: string): string {
  return subject.replace(/[\r\n]+/g, ' ');
}

export function createSmtpMailer(config: SmtpConfig): Mailer {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(!config.secure && config.requireTls ? { requireTLS: true } : {}),
    ...(config.user && config.pass ? { auth: { user: config.user, pass: config.pass } } : {}),
  });
  return {
    async send(msg) {
      await transport.sendMail({
        from: config.from,
        ...msg,
        subject: sanitizeSubject(msg.subject),
      });
    },
  };
}

/** In-memory mailer for tests. */
export function createMemoryMailer(): Mailer & {
  sent: MailMessage[];
  failNext(error?: Error): void;
} {
  let fail: Error | null = null;
  const sent: MailMessage[] = [];
  return {
    sent,
    failNext(error) {
      fail = error ?? new Error('Simulated mail failure');
    },
    async send(msg) {
      if (fail) {
        const error = fail;
        fail = null;
        throw error;
      }
      sent.push(msg);
    },
  };
}
