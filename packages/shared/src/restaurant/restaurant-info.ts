/** Datos del restaurante. Provisionales hasta que el cliente confirme dirección y horario. */
export const RESTAURANT_INFO = {
  name: 'Pachamama Restaurant',
  address: { street: 'Am Gaswerk 1', postalCode: '28197', city: 'Bremen' },
  openingHours: {
    de: 'Di–So 13:00–22:00 · Mo Ruhetag',
    es: 'Mar–Dom 13:00–22:00 · Lunes cerrado',
  },
  isProvisional: true,
} as const;
