import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * Cliente de Better Auth. Usa el mismo origen que la web (/api/auth): en desarrollo
 * lo reenvía el proxy de Vite, así la cookie de sesión es de primera parte.
 */
export const authClient = createAuthClient({
  baseURL: typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin,
  plugins: [adminClient()],
});
