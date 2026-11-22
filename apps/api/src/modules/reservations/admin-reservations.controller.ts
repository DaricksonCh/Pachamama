import {
  DECISION_STATUSES,
  isoDateSchema,
  RESERVATION_STATUSES,
  reservationStatusChangeSchema,
} from '@pachamama/shared';
import type { Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/app-error';
import type { AdminReservationsService } from './admin-reservations.service';

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

const idParam = z.coerce.number().int().positive();
const listQuerySchema = z.object({
  date: isoDateSchema,
  status: z.enum(RESERVATION_STATUSES).optional(),
});
const previewQuerySchema = z.object({ status: z.enum(DECISION_STATUSES) });

const id = (req: Request) => parse(idParam, req.params.id);
/** requireAuth always runs first on this router. */
const actorId = (res: Response) =>
  (res.locals.session as NonNullable<typeof res.locals.session>).user.id;

export function createAdminReservationsController(service: AdminReservationsService) {
  const list: RequestHandler = async (req, res) => {
    const q = parse(listQuerySchema, req.query);
    res.json({ data: await service.listDay(q.date, q.status) });
  };
  const pendingCount: RequestHandler = async (_req, res) => {
    res.json({ data: await service.pendingCount() });
  };
  const get: RequestHandler = async (req, res) => {
    res.json({ data: await service.get(id(req)) });
  };
  const messagePreview: RequestHandler = async (req, res) => {
    const q = parse(previewQuerySchema, req.query);
    res.json({ data: await service.messagePreview(id(req), q.status) });
  };
  const changeStatus: RequestHandler = async (req, res) => {
    const input = parse(reservationStatusChangeSchema, req.body);
    res.json({ data: await service.changeStatus(id(req), input, actorId(res)) });
  };
  const resendEmail: RequestHandler = async (req, res) => {
    res.json({ data: await service.resendEmail(id(req), actorId(res)) });
  };

  return { list, pendingCount, get, messagePreview, changeStatus, resendEmail };
}
