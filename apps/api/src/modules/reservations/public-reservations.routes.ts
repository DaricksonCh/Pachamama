import { Router } from 'express';
import { env } from '../../config/env';
import { db } from '../../db/database';
import { mailer } from '../../lib/mail';
import { reservationLimiter } from '../../middlewares/rate-limit';
import { createReservationsController } from './reservations.controller';
import { createReservationsRepository } from './reservations.repository';
import { createReservationsService } from './reservations.service';
import { settingsService } from './settings.routes';

export const reservationsService = createReservationsService(
  createReservationsRepository(db),
  settingsService,
  mailer,
  { notifyEmail: env.RESERVATIONS_NOTIFY_EMAIL, webOrigin: env.WEB_ORIGIN },
);
const c = createReservationsController(reservationsService);

/** /api/v1/reservations — disponibilidad y solicitudes de reserva (público). */
export const publicReservationsRouter = Router();

publicReservationsRouter.get('/availability', c.availability);
publicReservationsRouter.post(
  '/',
  reservationLimiter(env.RATE_LIMIT_RESERVATION_PER_10MIN),
  c.create,
);
