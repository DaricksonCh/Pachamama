import { Router } from 'express';
import { db } from '../../db/database';
import { requireAuth, requireRole } from '../../middlewares/require-auth';
import { createStaffController } from './staff.controller';
import { createStaffRepository } from './staff.repository';
import { createStaffService } from './staff.service';

const controller = createStaffController(createStaffService(createStaffRepository(db)));

/** GET /api/v1/me — usuario de la sesión (cualquier rol). */
export const meRouter = Router();
meRouter.get('/', requireAuth, controller.me);

/** GET /api/v1/admin/users — listado del personal (solo admin). */
export const adminUsersRouter = Router();
adminUsersRouter.get('/', requireAuth, requireRole('admin'), controller.list);
