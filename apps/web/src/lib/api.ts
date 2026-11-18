import type { z } from 'zod';

/**
 * GET a la API y valida la respuesta con un schema de @pachamama/shared.
 * Usa rutas relativas (/api/...): en desarrollo las reenvía el proxy de Vite.
 */
export async function apiGet<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  init?: RequestInit,
): Promise<z.infer<TSchema>> {
  const res = await fetch(path, { credentials: 'include', ...init });
  if (!res.ok) {
    throw new Error(`GET ${path} failed with status ${res.status}`);
  }
  return schema.parse(await res.json());
}
