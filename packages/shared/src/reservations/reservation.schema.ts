import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../i18n/languages';

const REQUIRED = { error: 'validation.required' };
const TOO_LONG = { error: 'validation.tooLong' };

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'validation.date' });

/** HH:mm, 24 h. */
const clockSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'validation.time' });

/** HH:mm on the half hour (booking slots). */
export const slotTimeSchema = z.string().regex(/^([01]\d|2[0-3]):(00|30)$/, {
  error: 'validation.time',
});

export const reservationRequestSchema = z.object({
  partySize: z.number({ error: REQUIRED.error }).int({ error: 'validation.int' }).min(1).max(100),
  date: dateSchema,
  time: slotTimeSchema,
  name: z.string({ error: REQUIRED.error }).trim().min(2, REQUIRED).max(100, TOO_LONG),
  email: z.email({ error: 'validation.email' }).max(254, TOO_LONG),
  phone: z
    .string({ error: REQUIRED.error })
    .trim()
    .min(6, { error: 'validation.phone' })
    .max(30, { error: 'validation.phone' })
    .regex(/^[0-9+ ]+$/, { error: 'validation.phone' }),
  comment: z.string().trim().max(500, TOO_LONG).optional(),
  lang: z.enum(SUPPORTED_LANGUAGES, { error: 'validation.language' }),
  privacyAccepted: z.literal(true, { error: 'validation.privacy' }),
  /** Honeypot: real users never fill it. */
  website: z.string().max(0).optional().default(''),
});
export type ReservationRequest = z.infer<typeof reservationRequestSchema>;

const openingHoursRangeSchema = z
  .object({
    weekday: z.number().int().min(0).max(6), // 0 = Sunday
    opens: clockSchema,
    closes: clockSchema,
  })
  .refine((r) => r.opens < r.closes, { error: 'validation.range', path: ['closes'] });
export type OpeningHoursRange = z.infer<typeof openingHoursRangeSchema>;

export const openingHoursSchema = z.array(openingHoursRangeSchema).superRefine((ranges, ctx) => {
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const a = ranges[i];
      const b = ranges[j];
      if (a && b && a.weekday === b.weekday && a.opens < b.closes && b.opens < a.closes) {
        ctx.addIssue({ code: 'custom', message: 'validation.overlap', path: [j] });
      }
    }
  }
});
export type OpeningHours = z.infer<typeof openingHoursSchema>;

export const closureSchema = z
  .object({
    from: dateSchema,
    to: dateSchema,
    reasonDe: z.string().trim().max(200, TOO_LONG).optional(),
    reasonEs: z.string().trim().max(200, TOO_LONG).optional(),
  })
  .refine((c) => c.from <= c.to, { error: 'validation.range', path: ['to'] });
export type Closure = z.infer<typeof closureSchema>;

export const reservationSettingsSchema = z
  .object({
    slotMinutes: z.number().int().min(15).max(120),
    lastSlotBeforeCloseMinutes: z.number().int().min(0).max(240),
    partyMin: z.number().int().min(1).max(100),
    partyMax: z.number().int().min(1).max(100),
    capacityPerSlot: z.number().int().min(1).max(1000),
    minLeadMinutes: z.number().int().min(0).max(10080),
    maxAdvanceDays: z.number().int().min(1).max(365),
    sameDayOnline: z.boolean(),
  })
  .refine((s) => s.partyMin <= s.partyMax, { error: 'validation.range', path: ['partyMax'] });
export type ReservationSettings = z.infer<typeof reservationSettingsSchema>;

export const DEFAULT_RESERVATION_SETTINGS: ReservationSettings = {
  slotMinutes: 30,
  lastSlotBeforeCloseMinutes: 60,
  partyMin: 1,
  partyMax: 10,
  capacityPerSlot: 30,
  minLeadMinutes: 120,
  maxAdvanceDays: 60,
  sameDayOnline: false,
};
