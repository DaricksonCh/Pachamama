import { z } from 'zod';

export const RESERVATION_STATUSES = [
  'pending',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
  'no_show',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

/** Statuses that send an email to the guest (with an optional staff message). */
export const DECISION_STATUSES = ['confirmed', 'rejected', 'cancelled'] as const;

/** Only these statuses occupy capacity in a time slot. */
export const CAPACITY_STATUSES = ['pending', 'confirmed'] as const;

const TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  rejected: [],
  cancelled: [],
  completed: [],
  no_show: [],
};

export function canTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Body of PATCH /admin/reservations/:id/status. `message`/`subject` only apply to decision statuses. */
export const reservationStatusChangeSchema = z.object({
  status: z.enum(RESERVATION_STATUSES),
  message: z.string().trim().min(1).max(2000).optional(),
  subject: z.string().trim().min(1).max(150).optional(),
  notify: z.boolean().default(true),
});
export type ReservationStatusChange = z.input<typeof reservationStatusChangeSchema>;
