import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it.each(['/admin', '/admin/menu/dishes?status=visible', '/admin/menu/dishes/3'])(
    'keeps the internal panel path %s',
    (value) => expect(safeNext(value)).toBe(value),
  );

  it.each([
    '//evil.com',
    'https://evil.com',
    '/admin.evil',
    '/admin\\evil',
    '/admin/login',
    '/admin/login?next=/admin',
    'javascript:alert(1)',
    '',
    null,
    undefined,
  ])('falls back to /admin for %s', (value) => expect(safeNext(value)).toBe('/admin'));
});
