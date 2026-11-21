import type { RequestHandler } from 'express';
import { AppError } from '../../lib/app-error';
import type { StaffService } from './staff.service';

export function createStaffController(service: StaffService) {
  const me: RequestHandler = (_req, res) => {
    const session = res.locals.session;
    if (!session) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    res.json({ data: service.me(session) });
  };

  const list: RequestHandler = async (_req, res) => {
    res.json({ data: await service.list() });
  };

  return { me, list };
}
