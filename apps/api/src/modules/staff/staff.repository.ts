import type { Kysely } from 'kysely';
import type { Database } from '../../db/types';

/** Acceso a datos del personal. Solo consultas; sin reglas de negocio. */
export function createStaffRepository(db: Kysely<Database>) {
  return {
    listUsers() {
      return db
        .selectFrom('users')
        .select(['id', 'name', 'email', 'role', 'banned', 'createdAt'])
        .orderBy('createdAt', 'asc')
        .execute();
    },
  };
}

export type StaffRepository = ReturnType<typeof createStaffRepository>;
