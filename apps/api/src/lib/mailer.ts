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
  user?: string | undefined;
  pass?: string | undefined;
  from: string;
}

export function createSmtpMailer(config: SmtpConfig): Mailer {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.user && config.pass ? { auth: { user: config.user, pass: config.pass } } : {}),
  });
  return {
    async send(msg) {
      await transport.sendMail({ from: config.from, ...msg });
    },
  };
}

/** In-memory mailer for tests. */
export function createMemoryMailer(): Mailer & { sent: MailMessage[]; failNext(): void } {
  let fail = false;
  const sent: MailMessage[] = [];
  return {
    sent,
    failNext() {
      fail = true;
    },
    async send(msg) {
      if (fail) {
        fail = false;
        throw new Error('Simulated mail failure');
      }
      sent.push(msg);
    },
  };
}
