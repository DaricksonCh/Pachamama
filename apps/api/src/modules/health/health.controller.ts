import type { HealthResponse } from '@pachamama/shared';
import type { RequestHandler } from 'express';

const version = process.env.npm_package_version ?? '0.0.0';

export const getHealth: RequestHandler = (_req, res) => {
  const body: HealthResponse = {
    status: 'ok',
    service: 'pachamama-api',
    version,
    timestamp: new Date().toISOString(),
  };
  res.json(body);
};
