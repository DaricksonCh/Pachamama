import {
  DECISION_STATUSES,
  isoDateSchema,
  RESERVATION_STATUSES,
  reservationStatusChangeSchema,
} from '@pachamama/shared';
import type { Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { parseOrThrow } from '../../lib/parse';
import type { AdminReservationsService } from './admin-reservations.service';

const idParam = z.coerce.number().int().positive();
const listQuerySchema = z.object({
  date: isoDateSchema,
  status: z.enum(RESERVATION_STATUSES).optional(),
});
const previewQuerySchema = z.object({ status: z.enum(DECISION_STATUSES) });

const id = (req: Request) => parseOrThrow(idParam, req.params.id);
/** requireAuth always runs first on this router. */
const actorId = (res: Response) =>
  (res.locals.session as NonNullable<typeof res.locals.session>).user.id;

export function createAdminReservationsController(service: AdminReservationsService) {
  const list: RequestHandler = async (req, res) => {
    const q = parseOrThrow(listQuerySchema, req.query);
    res.json({ data: await service.listDay(q.date, q.status) });
  };
  const pendingCount: RequestHandler = async (_req, res) => {
    res.json({ data: await service.pendingCount() });
  };
  const get: RequestHandler = async (req, res) => {
    res.json({ data: await service.get(id(req)) });
  };
  const messagePreview: RequestHandler = async (req, res) => {
    const q = parseOrThrow(previewQuerySchema, req.query);
    res.json({ data: await service.messagePreview(id(req), q.status) });
  };
  const changeStatus: RequestHandler = async (req, res) => {
    const input = parseOrThrow(reservationStatusChangeSchema, req.body);
    res.json({ data: await service.changeStatus(id(req), input, actorId(res)) });
  };
  const resendEmail: RequestHandler = async (req, res) => {
    res.json({ data: await service.resendEmail(id(req), actorId(res)) });
  };

  return { list, pendingCount, get, messagePreview, changeStatus, resendEmail };
}
