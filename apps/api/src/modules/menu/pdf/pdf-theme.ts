/** Paleta y tipografía del PDF de la carta: la de la web (ADR 0010) y el papel del recetario. */
export const colors = {
  selva: '#2F4A2B',
  selvaDeep: '#233A20',
  maiz: '#E3B23C',
  aji: '#C8402A',
  ajiDeep: '#A8331F',
  chicha: '#6B2D5C',
  /** Papel de la etiqueta y de las polaroids. */
  paper: '#FFFDF8',
  /** Fondo de las páginas de platos (papel de álbum). */
  page: '#F3ECDC',
  text: '#1F2A1D',
  muted: '#4A5544',
  line: '#D9CDB2',
  frame: '#E2D7BF',
} as const;

export const fonts = {
  display: 'Fraunces',
  body: 'WorkSans',
  script: 'Caveat',
} as const;

/** A4 en puntos y márgenes de las páginas de platos. */
export const page = {
  width: 595.28,
  height: 841.89,
  marginX: 48,
} as const;
