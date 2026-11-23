import { beforeEach, describe, expect, it, vi } from 'vitest';

const createTransport = vi.fn(() => ({ sendMail: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport } }));

const { createSmtpMailer } = await import('./mailer');

const base = { host: 'smtp.provider.net', port: 587, from: 'a@b.de' };

describe('createSmtpMailer transport options', () => {
  beforeEach(() => createTransport.mockClear());

  it('passes requireTLS when STARTTLS is mandatory', () => {
    createSmtpMailer({ ...base, secure: false, requireTls: true });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: false, requireTLS: true }),
    );
  });

  it('does not force TLS when not required or when already secure', () => {
    createSmtpMailer({ ...base, secure: false, requireTls: false });
    createSmtpMailer({ ...base, secure: true, requireTls: true });
    const [dev, implicit] = createTransport.mock.calls.map((c) => c[0] as Record<string, unknown>);
    expect(dev).not.toHaveProperty('requireTLS');
    expect(implicit).not.toHaveProperty('requireTLS');
  });
});
