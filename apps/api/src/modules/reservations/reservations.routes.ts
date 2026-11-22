import { Router } from 'express';
import { db } from '../../db/database';
import { mailer } from '../../lib/mail';
import { requireAuth, requireRole } from '../../middlewares/require-auth';
import { createAdminReservationsController } from './admin-reservations.controller';
import { createAdminReservationsService } from './admin-reservations.service';
import { createReservationsRepository } from './reservations.repository';

const c = createAdminReservationsController(
  createAdminReservationsService(createReservationsRepository(db), mailer),
);

/** /api/v1/admin/reservations — gestión de reservas (admin y staff). */
export const adminReservationsRouter = Router();
adminReservationsRouter.use(requireAuth, requireRole('admin', 'staff'));

adminReservationsRouter.get('/', c.list);
adminReservationsRouter.get('/pending-count', c.pendingCount);
adminReservationsRouter.get('/:id', c.get);
adminReservationsRouter.get('/:id/message-preview', c.messagePreview);
adminReservationsRouter.patch('/:id/status', c.changeStatus);
adminReservationsRouter.post('/:id/resend-email', c.resendEmail);
