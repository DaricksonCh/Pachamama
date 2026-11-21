import { isRole, type StaffUser } from '@pachamama/shared';
import type { AuthSession } from '../../auth/auth';
import type { StaffRepository } from './staff.repository';

export function createStaffService(repo: StaffRepository) {
  return {
    /** Datos públicos del usuario de la sesión (nunca la sesión completa ni el token). */
    me(session: AuthSession): StaffUser {
      const { id, name, email, role } = session.user;
      return { id, name, email, role: isRole(role) ? role : null };
    },

    async list(): Promise<StaffUser[]> {
      const rows = await repo.listUsers();
      return rows.map(({ id, name, email, role }) => ({
        id,
        name,
        email,
        role: isRole(role) ? role : null,
      }));
    },
  };
}

export type StaffService = ReturnType<typeof createStaffService>;
