import { createStaffUserSchema, type CreateStaffUserInput } from '@pachamama/shared';
import type { Auth } from './auth';

/**
 * Crea un usuario del personal con contraseña (hash de Better Auth, scrypt).
 * Lo usan el script del primer admin y los tests. No hay registro público.
 */
export async function createStaffUser(auth: Auth, input: CreateStaffUserInput) {
  const data = createStaffUserSchema.parse(input);
  const ctx = await auth.$context;

  const existing = await ctx.internalAdapter.findUserByEmail(data.email);
  if (existing) {
    throw new Error(`Ya existe un usuario con el email ${data.email}`);
  }

  const passwordHash = await ctx.password.hash(data.password);
  const user = await ctx.internalAdapter.createUser(
    { name: data.name, email: data.email, emailVerified: true, role: data.role },
    { method: 'admin' },
  );

  try {
    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: passwordHash,
    });
  } catch (err) {
    // Sin cuenta con contraseña el usuario no sirve: se deshace el alta.
    await ctx.internalAdapter.deleteUser(user.id);
    throw err;
  }

  return { id: user.id, name: user.name, email: user.email, role: data.role };
}
