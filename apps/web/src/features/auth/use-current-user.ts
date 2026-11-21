import { staffUserSchema } from '@pachamama/shared';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError, apiGet } from '@/lib/api';

export const currentUserQueryKey = ['auth', 'me'] as const;

const meResponseSchema = z.object({ data: staffUserSchema });

/** Usuario del panel con sesión, o `null` si no hay sesión (401). */
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: async ({ signal }) => {
      try {
        return (await apiGet('/api/v1/me', meResponseSchema, { signal })).data;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}
