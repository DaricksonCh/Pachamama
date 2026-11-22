import { describe, expect, it } from 'vitest';
import { LEGAL_PLACEHOLDER, RESTAURANT_INFO, legalHasPlaceholders } from './restaurant-info';

describe('RESTAURANT_INFO.legal', () => {
  it('is flagged provisional and uses only the placeholder marker for unknown data', () => {
    expect(RESTAURANT_INFO.provisionalFields).toContain('legal');
    expect(RESTAURANT_INFO.legal.operatorName).toBe(LEGAL_PLACEHOLDER);
    expect(RESTAURANT_INFO.legal.vatId).toBe(LEGAL_PLACEHOLDER);
    expect(legalHasPlaceholders()).toBe(true);
  });

  it('defaults the legal address to the restaurant address', () => {
    expect(RESTAURANT_INFO.legal.address).toEqual(RESTAURANT_INFO.address);
  });
});
