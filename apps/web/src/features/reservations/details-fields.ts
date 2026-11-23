import type { ReservationRequest } from '@pachamama/shared';

export const COMMENT_MAX = 500;
export const FORM_ID = 'reservation-form';

/** Values of the details form (the choices of the earlier steps join them when validating). */
export interface DetailsValues {
  name: string;
  email: string;
  phone: string;
  comment: string;
  privacyAccepted: boolean;
  website: string;
}

export const DETAILS_FIELDS = ['name', 'email', 'phone', 'comment', 'privacyAccepted'] as const;
export type DetailsField = (typeof DETAILS_FIELDS)[number];

/** What the client validates: the API's schema without the honeypot, so autofill cannot block silently. */
export type ClientRequest = Omit<ReservationRequest, 'website'>;
