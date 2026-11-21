import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiSend } from './api';

const schema = z.object({ data: z.object({ id: z.number() }) });

describe('apiSend', () => {
  it('sends JSON with a content type and validates the response', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ data: { id: 1 } }));

    const result = await apiSend('POST', '/api/v1/x', { a: 1 }, schema);

    expect(result).toEqual({ data: { id: 1 } });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
    expect(init?.body).toBe('{"a":1}');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
  });

  it('sends FormData without forcing a content type (the browser adds the boundary)', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ data: { id: 1 } }));
    const form = new FormData();
    form.set('altDe', 'x');

    await apiSend('PUT', '/api/v1/x', form, schema);

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.body).toBe(form);
    expect(new Headers(init?.headers).has('Content-Type')).toBe(false);
  });

  it('returns undefined for 204 responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiSend('DELETE', '/api/v1/x')).resolves.toBeUndefined();
  });

  it('throws an ApiError with status and stable code on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ error: { code: 'CATEGORY_HAS_DISHES', message: 'm' } }, { status: 409 }),
    );

    await expect(apiSend('PATCH', '/api/v1/x', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      code: 'CATEGORY_HAS_DISHES',
    });
  });
});
