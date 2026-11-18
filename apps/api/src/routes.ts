import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes';

/** Rutas de negocio bajo /api/v1. Cada módulo registra aquí su router. */
export const apiV1Router = Router();

apiV1Router.use('/health', healthRouter);
