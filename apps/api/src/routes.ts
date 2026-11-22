import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes';
import { adminUsersRouter, meRouter } from './modules/staff/staff.routes';
import { adminMenuRouter } from './modules/menu/menu.routes';
import { publicMenuRouter } from './modules/menu/public-menu.routes';
import { publicReservationsRouter } from './modules/reservations/public-reservations.routes';
import { adminReservationSettingsRouter } from './modules/reservations/settings.routes';
import { adminReservationsRouter } from './modules/reservations/reservations.routes';

/** Rutas de negocio bajo /api/v1. Cada módulo registra aquí su router. */
export const apiV1Router = Router();

apiV1Router.use('/health', healthRouter);
apiV1Router.use('/me', meRouter);
apiV1Router.use('/menu', publicMenuRouter);
apiV1Router.use('/reservations', publicReservationsRouter);
apiV1Router.use('/admin/users', adminUsersRouter);
apiV1Router.use('/admin/menu', adminMenuRouter);
apiV1Router.use('/admin/reservation-settings', adminReservationSettingsRouter);
apiV1Router.use('/admin/reservations', adminReservationsRouter);
