import { Router } from 'express';
import { db } from '../../db/database';
import { requireAuth, requireRole } from '../../middlewares/require-auth';
import { createSettingsController } from './settings.controller';
import { createSettingsRepository } from './settings.repository';
import { createSettingsService } from './settings.service';

export const settingsService = createSettingsService(createSettingsRepository(db));
const c = createSettingsController(settingsService);

/** /api/v1/admin/reservation-settings — horario, cierres, ajustes y plantillas. */
export const adminReservationSettingsRouter = Router();
adminReservationSettingsRouter.use(requireAuth);

const any = requireRole('admin', 'staff');
const adminOnly = requireRole('admin');

adminReservationSettingsRouter.get('/hours', any, c.getHours);
adminReservationSettingsRouter.put('/hours', adminOnly, c.putHours);

adminReservationSettingsRouter.get('/closures', any, c.listClosures);
adminReservationSettingsRouter.post('/closures', adminOnly, c.createClosure);
adminReservationSettingsRouter.delete('/closures/:id', adminOnly, c.deleteClosure);

adminReservationSettingsRouter.get('/settings', any, c.getSettings);
adminReservationSettingsRouter.patch('/settings', adminOnly, c.patchSettings);

adminReservationSettingsRouter.get('/templates', any, c.listTemplates);
adminReservationSettingsRouter.put('/templates/:kind/:lang', adminOnly, c.putTemplate);
