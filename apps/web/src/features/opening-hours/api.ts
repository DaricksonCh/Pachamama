import { publicOpeningHoursSchema, type PublicOpeningHours } from '@pachamama/shared';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet } from '@/lib/api';

const responseSchema = z.object({ data: publicOpeningHoursSchema });

export const openingHoursKey = ['public', 'opening-hours'] as const;

export async function fetchOpeningHours(signal?: AbortSignal): Promise<PublicOpeningHours> {
  const res = await apiGet('/api/v1/opening-hours', responseSchema, { signal });
  return res.data;
}

/** Weekly hours and closure dates the staff keep in the panel (public, read only). */
export function useOpeningHours() {
  return useQuery({
    queryKey: openingHoursKey,
    queryFn: ({ signal }) => fetchOpeningHours(signal),
    // Hours change rarely; a few minutes of cache avoids refetching on every visit.
    staleTime: 5 * 60_000,
  });
}
