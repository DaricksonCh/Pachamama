import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from './health.schema';

describe('healthResponseSchema', () => {
  it('accepts a valid health response', () => {
    const result = healthResponseSchema.safeParse({
      status: 'ok',
      service: 'pachamama-api',
      version: '0.0.0',
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unexpected status', () => {
    const result = healthResponseSchema.safeParse({
      status: 'down',
      service: 'pachamama-api',
      version: '0.0.0',
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});
