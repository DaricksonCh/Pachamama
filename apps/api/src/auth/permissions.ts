import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';

/**
 * Permisos del plugin admin de Better Auth.
 * - admin: gestiona usuarios y sesiones (todo).
 * - staff: ningún permiso sobre usuarios; trabaja con carta, reservas, pedidos (módulos propios).
 */
export const ac = createAccessControl(defaultStatements);

export const roles = {
  admin: adminAc,
  staff: ac.newRole({ user: [], session: [] }),
};
