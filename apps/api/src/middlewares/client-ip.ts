import type { RequestHandler } from 'express';

/**
 * Deja en X-Forwarded-For una sola IP fiable antes de que Better Auth la lea (rate-limit).
 *
 * `req.ip` lo calcula Express con `trust proxy`: solo se fía de los saltos que vienen de un
 * proxy de confianza (por defecto, loopback = nginx en el mismo servidor). Así un cliente
 * externo no puede inventarse una IP para saltarse el límite de intentos, y un proxy que
 * añade (en vez de sobrescribir) la cabecera tampoco hace que todos compartan contador.
 */
export const normalizeClientIp: RequestHandler = (req, _res, next) => {
  const ip = req.ip ?? req.socket.remoteAddress;
  if (ip) {
    req.headers['x-forwarded-for'] = ip;
  } else {
    delete req.headers['x-forwarded-for'];
  }
  next();
};
