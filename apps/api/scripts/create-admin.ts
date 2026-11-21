/**
 * Crea el primer usuario administrador del panel.
 *   npm run admin:create -- --email persona@ejemplo.de --name "Nombre"
 * La contraseña se pide por teclado sin mostrarla (nunca como argumento: quedaría en el historial).
 * Para entornos sin teclado (CI) se puede pasar en la variable ADMIN_PASSWORD, solo desde un
 * gestor de secretos: nunca escrita en la línea de comandos (quedaría en el historial).
 */
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { parseArgs } from 'node:util';
import { PASSWORD_MIN_LENGTH, ROLES } from '@pachamama/shared';
import { z } from 'zod';
import { auth } from '../src/auth/auth';
import { createStaffUser } from '../src/auth/create-staff-user';
import { db } from '../src/db/database';

function askHidden(question: string): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stdout.write(chunk);
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    role: { type: 'string', default: 'admin' },
  },
});

try {
  if (!values.email || !values.name) {
    throw new Error('Uso: npm run admin:create -- --email <email> --name "<nombre>"');
  }

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await askHidden(`Contraseña (mínimo ${PASSWORD_MIN_LENGTH} caracteres): `);
    const repeat = await askHidden('Repite la contraseña: ');
    if (password !== repeat) throw new Error('Las contraseñas no coinciden');
  }

  // Un rol mal escrito (p. ej. "staf") no debe acabar creando un admin.
  const role = z.enum(ROLES).safeParse(values.role);
  if (!role.success) throw new Error(`Rol no válido: "${values.role}". Usa: ${ROLES.join(', ')}`);

  const user = await createStaffUser(auth, {
    email: values.email,
    name: values.name,
    password,
    role: role.data,
  });
  console.log(`✔ Usuario creado: ${user.email} (${user.role})`);
} catch (err) {
  const message =
    err && typeof err === 'object' && 'issues' in err
      ? 'Datos no válidos (email correcto, nombre de 2+ letras, contraseña de ' +
        `${PASSWORD_MIN_LENGTH}+ caracteres)`
      : err instanceof Error
        ? err.message
        : String(err);
  console.error('✖', message);
  process.exitCode = 1;
} finally {
  delete process.env.ADMIN_PASSWORD;
  await db.destroy();
}
