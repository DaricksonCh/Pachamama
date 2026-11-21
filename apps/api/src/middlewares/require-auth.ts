import { isRole, type Role } from '@pachamama/shared';
import { fromNodeHeaders } from 'better-auth/node';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { auth, type AuthSession } from '../auth/auth';
import { AppError } from '../lib/app-error';

declare module 'express-serve-static-core' {
  interface Locals {
    session?: AuthSession;
  }
}

/** Exige sesión válida y no bloqueada. Deja la sesión en `res.locals.session`. */
export const requireAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  if (session.user.banned) {
    throw new AppError(403, 'FORBIDDEN', 'Account disabled');
  }
  res.locals.session = session;
  next();
};

/** Exige uno de los roles indicados. Usar siempre después de `requireAuth`. */
export function requireRole(...allowed: Role[]): RequestHandler {
  return (_req, res, next) => {
    const role = res.locals.session?.user.role;
    if (!isRole(role) || !allowed.includes(role)) {
      throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
    }
    next();
  };
}
