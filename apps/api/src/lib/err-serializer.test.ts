import { describe, expect, it } from 'vitest';
import { createErrSerializer } from './err-serializer';

function dbError() {
  const err = new Error("Duplicate entry 'ana@test.invalid' for key 'email'") as Error & {
    code: string;
    errno: number;
    sqlState: string;
    sql: string;
    sqlMessage: string;
  };
  err.code = 'ER_DUP_ENTRY';
  err.errno = 1062;
  err.sqlState = '23000';
  err.sql = "INSERT INTO reservations (email) VALUES ('ana@test.invalid')";
  err.sqlMessage = "Duplicate entry 'ana@test.invalid' for key 'email'";
  return err;
}

describe('err serializer', () => {
  it('keeps only type, code, errno and sqlState', () => {
    const out = createErrSerializer(false)(dbError());
    expect(out).toEqual({ type: 'Error', code: 'ER_DUP_ENTRY', errno: 1062, sqlState: '23000' });
    const json = JSON.stringify(out);
    expect(json).not.toContain('ana@test.invalid');
    expect(json).not.toContain('INSERT');
    expect(json).not.toContain('Duplicate');
  });

  it('never logs a stack in production mode', () => {
    expect(createErrSerializer(false)(new Error('secret@x.de'))).not.toHaveProperty('stack');
  });

  it('copes with non-error values', () => {
    expect(createErrSerializer(false)('boom')).toEqual({ type: 'string' });
  });
});
