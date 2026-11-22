/**
 * Restaurant data shown on the public site. Fields marked PROVISIONAL are placeholders until the
 * restaurant confirms them (see docs/pendientes.md); `check:publish` blocks release while
 * `provisionalFields` is not empty.
 */

/** Marker for legal data the owner has not supplied yet. Pages show it as "[ausstehend]" / "[pendiente]". */
export const LEGAL_PLACEHOLDER = 'PENDIENTE' as const;

const ADDRESS = { street: 'Am Gaswerk 1', postalCode: '28197', city: 'Bremen' } as const;

export const RESTAURANT_INFO = {
  name: 'Pachamama Restaurant',
  address: ADDRESS,
  /** PROVISIONAL */
  openingHours: {
    de: 'Di–So 13:00–22:00 · Mo Ruhetag',
    es: 'Mar–Dom 13:00–22:00 · Lunes cerrado',
  },
  /** PROVISIONAL: E.164 for `tel:` links, plus the display form. */
  phone: { e164: '+494210000000', display: '0421 000 000 0' },
  /** PROVISIONAL */
  email: 'info@example.com',
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
    /** Optional: only if the business is entered in a commercial register. */
    commercialRegister: LEGAL_PLACEHOLDER,
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

/** True while any Impressum / privacy datum is still a placeholder or unconfirmed. */
export function legalHasPlaceholders(): boolean {
  const { addressConfirmed, operatorName, legalForm, representative } = RESTAURANT_INFO.legal;
  const { vatId, commercialRegister, contentResponsible } = RESTAURANT_INFO.legal;
  const { hostingProvider, logRetention } = RESTAURANT_INFO.legal;
  return (
    !addressConfirmed ||
    [
      operatorName,
      legalForm,
      representative,
      vatId,
      commercialRegister,
      contentResponsible,
      hostingProvider,
      logRetention,
    ].some((v) => v === LEGAL_PLACEHOLDER)
  );
}
