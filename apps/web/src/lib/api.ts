import type { z } from 'zod';

/** Error HTTP de la API con su estado y el código estable `{ error: { code } }`. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

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
    const body: unknown = await res.json().catch(() => null);
    const code =
      typeof body === 'object' && body !== null && 'error' in body
        ? (body.error as { code?: string }).code
        : undefined;
    throw new ApiError(res.status, code, `GET ${path} failed with status ${res.status}`);
  }
  return schema.parse(await res.json());
}
