/**
 * Restaurant data shown on the public site. Fields marked PROVISIONAL are placeholders until the
 * restaurant confirms them (see docs/pendientes.md); `check:publish` blocks release while
 * `provisionalFields` is not empty.
 */
export const RESTAURANT_INFO = {
  name: 'Pachamama Restaurant',
  address: { street: 'Am Gaswerk 1', postalCode: '28197', city: 'Bremen' },
  /** PROVISIONAL */
  openingHours: {
    de: 'Di–So 13:00–22:00 · Mo Ruhetag',
    es: 'Mar–Dom 13:00–22:00 · Lunes cerrado',
  },
  /** PROVISIONAL: E.164 for `tel:` links, plus the display form. */
  phone: { e164: '+494210000000', display: '0421 000 000 0' },
  /** PROVISIONAL */
  email: 'info@example.com',
  isProvisional: true,
  provisionalFields: ['openingHours', 'phone', 'email'],
} as const;
