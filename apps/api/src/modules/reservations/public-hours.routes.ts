import { Router, type RequestHandler } from 'express';
import type { SettingsService } from './settings.service';
import { settingsService } from './settings.routes';

export function createPublicHoursController(service: SettingsService) {
  const get: RequestHandler = async (_req, res) => {
    res.json({ data: await service.getPublicHours() });
  };
  return { get };
}

const c = createPublicHoursController(settingsService);

/** /api/v1/opening-hours — weekly hours and closure dates for the public site (read only). */
export const publicHoursRouter = Router();

publicHoursRouter.get('/', c.get);
