import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/admin/access';

/**
 * Permisos del plugin admin de Better Auth.
 * - admin: gestiona usuarios y sesiones, pero SIN suplantar a otros usuarios (no se necesita
 *   y así cada acción queda atribuida a quien la hace de verdad).
 * - staff: ningún permiso sobre usuarios; trabaja con carta, reservas, pedidos (módulos propios).
 */
export const ac = createAccessControl(defaultStatements);

const NOT_ALLOWED = new Set(['impersonate', 'impersonate-admins']);

export const roles = {
  admin: ac.newRole({
    user: defaultStatements.user.filter((action) => !NOT_ALLOWED.has(action)),
    session: [...defaultStatements.session],
  }),
  staff: ac.newRole({ user: [], session: [] }),
};
