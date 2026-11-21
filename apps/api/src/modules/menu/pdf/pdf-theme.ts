/** Paleta y tipografía del PDF de la carta (provisional hasta tener el diseño definitivo). */
export const colors = {
  green: '#2F4A2B',
  mustard: '#E3B23C',
  cream: '#FBF6EC',
  text: '#1F2A1D',
  /** Acentos del tejido andino y textos secundarios. */
  terracotta: '#B4532A',
  muted: '#5E6B57',
  line: '#D9CDB2',
  creamDark: '#F3EAD7',
} as const;

export const fonts = {
  display: 'Fraunces',
  body: 'WorkSans',
} as const;

/** A4 en puntos y márgenes de las páginas de platos. */
export const page = {
  width: 595.28,
  height: 841.89,
  marginX: 54,
} as const;
