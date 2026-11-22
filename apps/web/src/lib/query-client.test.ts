import { describe, expect, it, vi } from 'vitest';
import { currentUserQueryKey } from '@/features/auth/use-current-user';
import { apiSend } from './api';
import { createQueryClient } from './query-client';

describe('createQueryClient', () => {
  it('clears the current user when a mutation gets a 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));
    const client = createQueryClient();
    client.setQueryData(currentUserQueryKey, { id: 'u1' });

    await client
      .getMutationCache()
      .build(client, { mutationFn: () => apiSend('POST', '/api/v1/x', {}) })
      .execute(undefined)
      .catch(() => undefined);

    expect(client.getQueryData(currentUserQueryKey)).toBeNull();
  });

  it('keeps the current user on other errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));
    const client = createQueryClient();
    client.setQueryData(currentUserQueryKey, { id: 'u1' });

    await client
      .getMutationCache()
      .build(client, { mutationFn: () => apiSend('POST', '/api/v1/x', {}) })
      .execute(undefined)
      .catch(() => undefined);

    expect(client.getQueryData(currentUserQueryKey)).toEqual({ id: 'u1' });
  });
});
