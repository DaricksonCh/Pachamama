import { healthResponseSchema } from '@pachamama/shared';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => apiGet('/api/v1/health', healthResponseSchema, { signal }),
  });
}
