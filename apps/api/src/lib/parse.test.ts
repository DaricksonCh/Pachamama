import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from './app-error';
import { parseOrThrow } from './parse';

const schema = z.object({ name: z.string().min(2), age: z.coerce.number().int() });

describe('parseOrThrow', () => {
  it('returns the parsed output', () => {
    expect(parseOrThrow(schema, { name: 'Ana', age: '3' })).toEqual({ name: 'Ana', age: 3 });
  });

  it('throws a 400 VALIDATION_ERROR with the flattened field errors', () => {
    let error: unknown;
    try {
      parseOrThrow(schema, { name: 'A', age: 'x' });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
    });
    expect(Object.keys((error as AppError).details as object).sort()).toEqual(['age', 'name']);
  });
});
