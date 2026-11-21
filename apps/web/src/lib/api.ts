import type { z } from 'zod';

/** Error HTTP de la API con su estado y el código estable `{ error: { code } }`. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
    /** Errores por campo de un 400 VALIDATION_ERROR (claves i18n). */
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Extrae el código estable `{ error: { code } }` de una respuesta de error. */
async function toApiError(res: Response, method: string, path: string) {
  const body: unknown = await res.json().catch(() => null);
  const error =
    typeof body === 'object' && body !== null && 'error' in body ? body.error : undefined;
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined;
  const details =
    typeof error === 'object' &&
    error !== null &&
    'details' in error &&
    typeof error.details === 'object' &&
    error.details !== null
      ? (error.details as Record<string, string[]>)
      : undefined;
  return new ApiError(
    res.status,
    code,
    `${method} ${path} failed with status ${res.status}`,
    details,
  );
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
  if (!res.ok) throw await toApiError(res, 'GET', path);
  return schema.parse(await res.json());
}

export type ApiWriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Escritura en la API. `body` puede ser un objeto (JSON) o `FormData` (multipart: el
 * navegador pone el `Content-Type` con su boundary, por eso no se fija aquí).
 * Respuestas sin cuerpo (204) devuelven `undefined`; si hay `schema`, se valida la respuesta.
 */
export async function apiSend<TSchema extends z.ZodType | undefined = undefined>(
  method: ApiWriteMethod,
  path: string,
  body?: unknown,
  schema?: TSchema,
  init?: RequestInit,
): Promise<TSchema extends z.ZodType ? z.infer<TSchema> : undefined> {
  const headers = new Headers(init?.headers);
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    payload = JSON.stringify(body);
  }
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    method,
    headers,
    body: payload,
  });
  if (!res.ok) throw await toApiError(res, method, path);
  if (!schema || res.status === 204) return undefined as never;
  return schema.parse(await res.json()) as never;
}
