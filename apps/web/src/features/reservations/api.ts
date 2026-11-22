import type { Language, ReservationRequest } from '@pachamama/shared';
import { z } from 'zod';
import { apiGet, apiSend } from '@/lib/api';

const monthAvailabilitySchema = z.object({
  data: z.object({
    days: z.array(z.string()),
    partyMin: z.number(),
    partyMax: z.number(),
    sameDayOnline: z.boolean(),
  }),
});
export type MonthAvailability = z.infer<typeof monthAvailabilitySchema>['data'];

const slotsSchema = z.object({
  data: z.object({
    slots: z.array(z.object({ time: z.string(), startsAt: z.string(), available: z.boolean() })),
  }),
});
export type Slot = z.infer<typeof slotsSchema>['data']['slots'][number];

const confirmationSchema = z.object({
  data: z.object({
    publicId: z.string(),
    startsAt: z.string(),
    partySize: z.number(),
    status: z.string(),
  }),
});
export type Confirmation = Pick<
  z.infer<typeof confirmationSchema>['data'],
  'publicId' | 'startsAt' | 'partySize'
>;

const BASE = '/api/v1/reservations';

export const availabilityKey = {
  month: (month: string) => ['public', 'reservations', 'month', month] as const,
  slots: (date: string, party: number) => ['public', 'reservations', 'slots', date, party] as const,
  allSlots: ['public', 'reservations', 'slots'] as const,
};

export async function fetchMonth(month: string, signal?: AbortSignal): Promise<MonthAvailability> {
  const res = await apiGet(`${BASE}/availability?month=${month}`, monthAvailabilitySchema, {
    signal,
  });
  return res.data;
}

export async function fetchSlots(date: string, party: number, signal?: AbortSignal) {
  const res = await apiGet(`${BASE}/availability?date=${date}&party=${party}`, slotsSchema, {
    signal,
  });
  return res.data.slots;
}

/** Payload of the form plus the wizard choices (what `reservationRequestSchema` parses). */
export type ReservationPayload = ReservationRequest & { lang: Language };

export async function createReservation(payload: ReservationPayload): Promise<Confirmation> {
  const res = await apiSend('POST', BASE, payload, confirmationSchema);
  return res.data;
}
