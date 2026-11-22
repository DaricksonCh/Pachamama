import { describe, expect, it } from 'vitest';
import { withDeadlockRetry } from './retry-deadlock';

const deadlock = () => Object.assign(new Error('Deadlock'), { errno: 1213 });

describe('withDeadlockRetry', () => {
  it('repite tras un deadlock y devuelve el resultado', async () => {
    let calls = 0;
    const result = await withDeadlockRetry(async () => {
      calls += 1;
      if (calls < 3) throw deadlock();
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('no repite errores que no son de bloqueo', async () => {
    let calls = 0;
    await expect(
      withDeadlockRetry(async () => {
        calls += 1;
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(calls).toBe(1);
  });

  it('se rinde tras agotar los intentos', async () => {
    let calls = 0;
    await expect(
      withDeadlockRetry(async () => {
        calls += 1;
        throw deadlock();
      }, 3),
    ).rejects.toThrow('Deadlock');
    expect(calls).toBe(3);
  });
});
