/**
 * Restaurant data shown on the public site. Fields marked PROVISIONAL are placeholders until the
 * restaurant confirms them (see docs/pendientes.md); `check:publish` blocks release while
 * `provisionalFields` is not empty.
 */

/** Marker for legal data the owner has not supplied yet. Pages show it as "[ausstehend]" / "[pendiente]". */
export const LEGAL_PLACEHOLDER = 'PENDIENTE' as const;

/** Last revision of the privacy policy (ISO date); the page formats it per language. */
export const PRIVACY_POLICY_UPDATED = '2026-11-22';

const ADDRESS = { street: 'Am Gaswerk 1', postalCode: '28197', city: 'Bremen' } as const;

export const RESTAURANT_INFO = {
  name: 'Pachamama Restaurant',
  address: ADDRESS,
  /** PROVISIONAL */
  openingHours: {
    de: 'Di–So 13:00–22:00 · Mo Ruhetag',
    es: 'Mar–Dom 13:00–22:00 · Lunes cerrado',
  },
  /** False while phone and email are placeholders; pages then mark them as provisional. */
  contactConfirmed: false,
  /** PROVISIONAL: E.164 for `tel:` links, plus the display form. */
  phone: { e164: '+494210000000', display: '0421 000 000 0' },
  /** PROVISIONAL */
  email: 'info@example.com',
  /** Official social media profiles (plain links, no embeds). */
  social: {
    instagram: 'https://www.instagram.com/pachamamarestaurantebremen/',
  },
  /**
   * PROVISIONAL: Impressum data (§ 5 DDG). Every field is a placeholder until the owner confirms it;
   * the legal address defaults to the restaurant address but still has to be confirmed.
   */
  legal: {
    operatorName: LEGAL_PLACEHOLDER,
    legalForm: LEGAL_PLACEHOLDER,
    representative: LEGAL_PLACEHOLDER,
    address: ADDRESS,
    addressConfirmed: false,
    vatId: LEGAL_PLACEHOLDER,
    /** Wirtschafts-ID (§ 27a UStG), if the business has one; `null` = not applicable (row hidden). */
    economicId: LEGAL_PLACEHOLDER as string | null,
    /** `null` = not entered in a commercial register (row hidden); placeholder = still to confirm. */
    commercialRegister: LEGAL_PLACEHOLDER as string | null,
    /** Responsible authority, e.g. for the Gaststättenerlaubnis (§ 5 Abs. 1 Nr. 3 DDG). */
    supervisoryAuthority: LEGAL_PLACEHOLDER,
    /** Responsible for content under § 18 Abs. 2 MStV. */
    contentResponsible: LEGAL_PLACEHOLDER,
    /** Hosting provider (privacy policy). */
    hostingProvider: LEGAL_PLACEHOLDER,
    /** How long web server logs are kept (privacy policy). */
    logRetention: LEGAL_PLACEHOLDER,
  },
  isProvisional: true,
  provisionalFields: ['openingHours', 'phone', 'email', 'legal'],
} as const;

/** True while phone and email are placeholders the restaurant has not confirmed. */
export function contactIsProvisional(): boolean {
  return !RESTAURANT_INFO.contactConfirmed;
}

/** True while any Impressum / privacy datum is still a placeholder or unconfirmed (`null` = n/a, OK). */
export function legalHasPlaceholders(): boolean {
  const { legal } = RESTAURANT_INFO;
  const values: (string | null)[] = [
    legal.operatorName,
    legal.legalForm,
    legal.representative,
    legal.vatId,
    legal.economicId,
    legal.commercialRegister,
    legal.supervisoryAuthority,
    legal.contentResponsible,
    legal.hostingProvider,
    legal.logRetention,
  ];
  return !legal.addressConfirmed || values.some((v) => v === LEGAL_PLACEHOLDER);
}
