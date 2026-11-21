import { Router } from 'express';
import { env } from '../../config/env';
import { db } from '../../db/database';
import { requireAuth, requireRole } from '../../middlewares/require-auth';
import { createMenuController } from './menu.controller';
import { createDiskImageStorage } from './images/image-storage';
import { imageUpload } from './images/upload';
import { menuEvents } from './menu-events';
import { createMenuRepository } from './menu.repository';
import { createMenuService } from './menu.service';

export const menuService = createMenuService(
  createMenuRepository(db),
  menuEvents,
  createDiskImageStorage(env.UPLOADS_DIR),
);
const c = createMenuController(menuService);

/** /api/v1/admin/menu — gestión de la carta (admin y staff; staff con permisos limitados). */
export const adminMenuRouter = Router();
adminMenuRouter.use(requireAuth);

const any = requireRole('admin', 'staff');
const adminOnly = requireRole('admin');

adminMenuRouter.get('/summary', any, c.summary);

adminMenuRouter.get('/categories', any, c.listCategories);
adminMenuRouter.post('/categories', adminOnly, c.createCategory);
adminMenuRouter.put('/categories/order', adminOnly, c.reorderCategories);
adminMenuRouter.get('/categories/:id', any, c.getCategory);
adminMenuRouter.patch('/categories/:id', adminOnly, c.updateCategory);

adminMenuRouter.get('/dishes', any, c.listDishes);
adminMenuRouter.post('/dishes', adminOnly, c.createDish);
adminMenuRouter.put('/dishes/order', adminOnly, c.reorderDishes);
adminMenuRouter.get('/dishes/:id', any, c.getDish);
// staff puede llamar, pero el service limita lo que puede cambiar (solo visible/hidden).
adminMenuRouter.patch('/dishes/:id', any, c.updateDish);
adminMenuRouter.put('/dishes/:id/image', adminOnly, imageUpload, c.setDishImage);
adminMenuRouter.delete('/dishes/:id/image', adminOnly, c.removeDishImage);
