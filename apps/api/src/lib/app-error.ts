/**
 * Error de aplicación con código estable (la web lo traduce con i18n) y estado HTTP.
 * Los services lanzan AppError; el manejador central lo convierte en respuesta.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
