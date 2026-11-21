import { z } from 'zod';

/** Roles del personal. `admin` gestiona todo (incluidos usuarios); `staff` el día a día. */
export const ROLES = ['admin', 'staff'] as const;
export type Role = (typeof ROLES)[number];
export const DEFAULT_ROLE: Role = 'staff';

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** Política de contraseñas: longitud manda más que la complejidad (NIST SP 800-63B). */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Login del panel. Los mensajes son claves i18n (la web las traduce).
 * Sin pistas de longitud en el login: eso solo se valida al crear la contraseña.
 */
export const loginSchema = z.object({
  email: z.email({ error: 'validation.email' }).trim().toLowerCase().max(255),
  password: z.string().min(1, { error: 'validation.required' }).max(PASSWORD_MAX_LENGTH),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Alta de un usuario del personal (script del primer admin y, más adelante, el panel). */
export const createStaffUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase().max(255),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
  role: z.enum(ROLES),
});
export type CreateStaffUserInput = z.infer<typeof createStaffUserSchema>;

/** Usuario del personal tal como lo devuelve la API (sin datos de sesión ni contraseña). */
export const staffUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: z.enum(ROLES).nullable(),
});
export type StaffUser = z.infer<typeof staffUserSchema>;
