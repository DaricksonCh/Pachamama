const LOGIN_PATH = /^\/admin\/login(?:[/?#]|$)/;
const PANEL_PATH = /^\/admin(?:[/?#][^\x5c]*)?$/;

/**
 * Destino tras el login: solo rutas internas del panel (/admin o /admin/...), nunca la propia
 * pantalla de login ni URLs externas (evita redirecciones abiertas).
 */
export function safeNext(value: string | null | undefined): string {
  if (!value || LOGIN_PATH.test(value)) return '/admin';
  return PANEL_PATH.test(value) ? value : '/admin';
}
