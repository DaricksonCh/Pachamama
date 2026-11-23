import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { availabilityKey, fetchMonth, fetchSlots } from './api';

/** Days with free tables in a `YYYY-MM` month, plus the party limits and same-day rule. */
export function useMonthAvailability(month: string) {
  return useQuery({
    queryKey: availabilityKey.month(month),
    queryFn: ({ signal }) => fetchMonth(month, signal),
    staleTime: 30_000,
    // The previous month's data stays while the next loads (party limits never flicker away).
    placeholderData: keepPreviousData,
  });
}

/** Slots of a day for a party size; only runs once both are chosen. */
export function useSlots(date: string | undefined, party: number | undefined) {
  return useQuery({
    queryKey: availabilityKey.slots(date ?? '', party ?? 0),
    queryFn: ({ signal }) => fetchSlots(date as string, party as number, signal),
    enabled: date !== undefined && party !== undefined,
    // Availability changes as others book: always show fresh slots when a step is reopened.
    staleTime: 0,
  });
}
