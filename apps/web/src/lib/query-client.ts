import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { currentUserQueryKey } from '@/features/auth/use-current-user';
import { ApiError } from '@/lib/api';

/**
 * Cliente de TanStack Query. Si cualquier consulta o mutación recibe un 401 (sesión
 * caducada o borrada), se marca "sin sesión": AdminLayout redirige a /admin/login.
 */
export function createQueryClient() {
  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // Un 401 no se arregla reintentando.
        retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 1,
        refetchOnWindowFocus: false,
      },
    },
    queryCache: new QueryCache({ onError: (error) => onUnauthorized(queryClient, error) }),
    mutationCache: new MutationCache({ onError: (error) => onUnauthorized(queryClient, error) }),
  });
  return queryClient;
}

function onUnauthorized(queryClient: QueryClient, error: Error) {
  if (error instanceof ApiError && error.status === 401) {
    queryClient.setQueryData(currentUserQueryKey, null);
  }
}
