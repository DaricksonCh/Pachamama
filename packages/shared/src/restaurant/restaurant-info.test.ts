import { afterEach, describe, expect, it } from 'vitest';
import {
  LEGAL_PLACEHOLDER,
  PRIVACY_POLICY_UPDATED,
  RESTAURANT_INFO,
  contactIsProvisional,
  legalHasPlaceholders,
} from './restaurant-info';

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

describe('contact and legal helpers', () => {
  it('flags the placeholder contact data as provisional', () => {
    expect(RESTAURANT_INFO.contactConfirmed).toBe(false);
    expect(contactIsProvisional()).toBe(true);
  });

  it('keeps the new legal fields pending until the owner confirms them', () => {
    expect(RESTAURANT_INFO.legal.supervisoryAuthority).toBe(LEGAL_PLACEHOLDER);
    expect(RESTAURANT_INFO.legal.economicId).toBe(LEGAL_PLACEHOLDER);
    expect(RESTAURANT_INFO.legal.commercialRegister).toBe(LEGAL_PLACEHOLDER);
  });

  it('exposes the privacy policy date as an ISO date', () => {
    expect(PRIVACY_POLICY_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('legalHasPlaceholders with not-applicable fields', () => {
  const legal = RESTAURANT_INFO.legal as Record<string, unknown>;
  const original = { ...legal };
  afterEach(() => Object.assign(legal, original));

  it('treats null (not applicable) as resolved but a placeholder as pending', () => {
    Object.assign(legal, {
      operatorName: 'A',
      legalForm: 'B',
      representative: 'C',
      vatId: 'D',
      economicId: null,
      commercialRegister: null,
      supervisoryAuthority: 'E',
      contentResponsible: 'F',
      hostingProvider: 'G',
      logRetention: 'H',
      smtpProvider: 'I',
      mailboxRetention: 'J',
      addressConfirmed: true,
    });
    expect(legalHasPlaceholders()).toBe(false);

    legal.commercialRegister = LEGAL_PLACEHOLDER;
    expect(legalHasPlaceholders()).toBe(true);
  });

  it('keeps blocking while the mailbox retention is still a placeholder', () => {
    Object.assign(legal, {
      operatorName: 'A',
      legalForm: 'B',
      representative: 'C',
      vatId: 'D',
      economicId: null,
      commercialRegister: null,
      supervisoryAuthority: 'E',
      contentResponsible: 'F',
      hostingProvider: 'G',
      logRetention: 'H',
      smtpProvider: 'I',
      addressConfirmed: true,
    });
    expect(legalHasPlaceholders()).toBe(true);
    legal.mailboxRetention = '30 Tage';
    expect(legalHasPlaceholders()).toBe(false);
  });
});
