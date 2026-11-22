import { describe, expect, it } from 'vitest';
import {
  DECISION_STATUSES,
  RESERVATION_STATUSES,
  canTransition,
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
