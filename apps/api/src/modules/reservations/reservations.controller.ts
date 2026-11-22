import { isoDateSchema, reservationRequestSchema, slotTimeSchema, toUtc } from '@pachamama/shared';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/app-error';
import { logger } from '../../lib/logger';
import type { ReservationsService } from './reservations.service';

function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Invalid input',
      z.flattenError(result.error).fieldErrors,
    );
  }
  return result.data;
}

/** `month` alone, or `date` + `party`; anything else is rejected. */
const availabilityQuerySchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional(),
    date: isoDateSchema.optional(),
    party: z
      .string()
      .regex(/^\d{1,3}$/)
      .transform(Number)
      .optional(),
  })
  .superRefine((q, ctx) => {
    const monthForm = q.month !== undefined && q.date === undefined && q.party === undefined;
    const dayForm = q.month === undefined && q.date !== undefined && q.party !== undefined;
    if (!monthForm && !dayForm) {
      ctx.addIssue({
        code: 'custom',
        message: 'Use either month, or date together with party',
        path: ['month'],
      });
    }
  });

/** Fake success for bots: same shape as the real response, nothing stored or sent. */
function honeypotResponse(body: Record<string, unknown>) {
  const date = isoDateSchema.safeParse(body.date);
  const time = slotTimeSchema.safeParse(body.time);
  const startsAt = date.success && time.success ? toUtc(date.data, time.data) : new Date();
  const partySize = Number.isInteger(body.partySize) ? (body.partySize as number) : 1;
  return {
    publicId: crypto.randomUUID(),
    startsAt: startsAt.toISOString(),
    partySize,
    status: 'pending' as const,
  };
}

export function createReservationsController(service: ReservationsService) {
  const availability: RequestHandler = async (req, res) => {
    const q = parse(availabilityQuerySchema, req.query);
    if (q.month !== undefined) {
      res.json({ data: await service.availableDays(q.month) });
      return;
    }
    // The schema guarantees date and party together here.
    res.json({ data: await service.slotsFor(q.date as string, q.party as number) });
  };

  const create: RequestHandler = async (req, res) => {
    const body: unknown = req.body;
    if (typeof body === 'object' && body !== null && 'website' in body) {
      const { website } = body as { website?: unknown };
      if (typeof website === 'string' && website.length > 0) {
        logger.info('Reservation honeypot triggered');
        res.status(201).json({ data: honeypotResponse(body as Record<string, unknown>) });
        return;
      }
    }
    const input = parse(reservationRequestSchema, body);
    res.status(201).json({ data: await service.create(input) });
  };

  return { availability, create };
}
