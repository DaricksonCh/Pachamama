import { z } from 'zod';
import { AppError } from './app-error';

/** Validates with Zod; on failure → 400 VALIDATION_ERROR with the per-field details for the form. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Invalid input',
      z.flattenError(result.error).fieldErrors,
    );
  }
  return result.data;
}
