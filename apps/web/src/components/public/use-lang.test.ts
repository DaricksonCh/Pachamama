import { describe, expect, it } from 'vitest';
import { normalizeLanguage } from './use-lang';

describe('normalizeLanguage', () => {
  it('keeps supported languages', () => {
    expect(normalizeLanguage('de')).toBe('de');
    expect(normalizeLanguage('es')).toBe('es');
  });

  it('uses the part before the dash for regional tags', () => {
    expect(normalizeLanguage('es-ES')).toBe('es');
    expect(normalizeLanguage('de-AT')).toBe('de');
  });

  it('falls back to German for unknown or missing values', () => {
    expect(normalizeLanguage('fr')).toBe('de');
    expect(normalizeLanguage('')).toBe('de');
    expect(normalizeLanguage(undefined)).toBe('de');
  });
});
