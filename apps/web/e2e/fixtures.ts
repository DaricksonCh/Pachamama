/**
 * Datos de prueba de los e2e (solo existen en la BD `pachamama_test`).
 * Los e2e levantan su propia API (puerto 3100) y web (5174) contra esa BD,
 * para no tocar nunca la BD de desarrollo.
 */
export const E2E_API_PORT = 3100;
export const E2E_WEB_PORT = 5174;

export const E2E_ADMIN = {
  name: 'Elena Admin',
  email: 'e2e-admin@pachamama.test',
  password: 'E2e-Admin-Passw0rd!',
};

export const E2E_STAFF = {
  name: 'Pablo Personal',
  email: 'e2e-staff@pachamama.test',
  password: 'E2e-Staff-Passw0rd!',
};

/** Variables de entorno para el script de seed y la API de e2e. */
export function e2eEnv(): Record<string, string> {
  return {
    E2E_ADMIN_NAME: E2E_ADMIN.name,
    E2E_ADMIN_EMAIL: E2E_ADMIN.email,
    E2E_ADMIN_PASSWORD: E2E_ADMIN.password,
    E2E_STAFF_NAME: E2E_STAFF.name,
    E2E_STAFF_EMAIL: E2E_STAFF.email,
    E2E_STAFF_PASSWORD: E2E_STAFF.password,
  };
}
