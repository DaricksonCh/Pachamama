/**
 * Crea el primer usuario administrador del panel.
 *   npm run admin:create -- --email persona@ejemplo.de --name "Nombre"
 * La contraseña se pide por teclado sin mostrarla (nunca como argumento: quedaría en el historial).
 * Para entornos sin teclado (CI) se puede pasar en la variable ADMIN_PASSWORD.
 */
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { parseArgs } from 'node:util';
import { PASSWORD_MIN_LENGTH } from '@pachamama/shared';
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

  const user = await createStaffUser(auth, {
    email: values.email,
    name: values.name,
    password,
    role: values.role === 'staff' ? 'staff' : 'admin',
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
  await db.destroy();
}
