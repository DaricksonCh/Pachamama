import { describe, expect, it } from 'vitest';
import {
  DECISION_STATUSES,
  RESERVATION_STATUSES,
  canTransition,
  reservationStatusChangeSchema,
  type ReservationStatus,
} from './reservation-status';

const VALID: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  rejected: [],
  cancelled: [],
  completed: [],
  no_show: [],
};

describe('canTransition', () => {
  for (const from of RESERVATION_STATUSES) {
    for (const to of RESERVATION_STATUSES) {
      const expected = VALID[from].includes(to);
      it(`${from} -> ${to} is ${expected ? 'allowed' : 'rejected'}`, () => {
        expect(canTransition(from, to)).toBe(expected);
      });
    }
  }

  it('exposes the decision statuses', () => {
    expect(DECISION_STATUSES).toEqual(['confirmed', 'rejected', 'cancelled']);
  });
});

describe('reservationStatusChangeSchema', () => {
  it('defaults notify to true and trims text', () => {
    const r = reservationStatusChangeSchema.parse({ status: 'confirmed', message: '  hi  ' });
    expect(r).toEqual({ status: 'confirmed', message: 'hi', notify: true });
  });
  it('rejects empty, oversized or unknown values', () => {
    for (const bad of [
      { status: 'nope' },
      { status: 'confirmed', message: '   ' },
      { status: 'confirmed', message: 'x'.repeat(2001) },
      { status: 'confirmed', subject: 'x'.repeat(151) },
    ]) {
      expect(reservationStatusChangeSchema.safeParse(bad).success).toBe(false);
    }
  });
});
