import { describe, expect, it } from 'vitest';
import { httpLogSerializers } from './http-log';

describe('logs de peticiones sin datos personales (DSGVO)', () => {
  it('no guardan IP, user agent, cabeceras ni query string', () => {
    const logged = httpLogSerializers.req({
      id: 7,
      method: 'POST',
      url: '/api/auth/sign-in/email?email=ana@pachamama.test',
      ...({
        remoteAddress: '203.0.113.9',
        headers: { 'user-agent': 'Mozilla', 'x-forwarded-for': '203.0.113.9', cookie: 'x' },
      } as object),
    });

    expect(logged).toEqual({ id: 7, method: 'POST', url: '/api/auth/sign-in/email' });
    expect(JSON.stringify(logged)).not.toMatch(/203\.0\.113\.9|Mozilla|ana@/);
  });

  it('de la respuesta solo guardan el código de estado', () => {
    expect(
      httpLogSerializers.res({
        statusCode: 200,
        ...({ headers: { 'set-cookie': 'x' } } as object),
      }),
    ).toEqual({ statusCode: 200 });
  });
});
