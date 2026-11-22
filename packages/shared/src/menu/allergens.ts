/** Los 14 alérgenos de declaración obligatoria (Reglamento UE 1169/2011), letras A–N. */
export const ALLERGEN_CODES = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
] as const;
export type AllergenCode = (typeof ALLERGEN_CODES)[number];

export const ALLERGENS: Record<AllergenCode, { de: string; es: string }> = {
  A: { de: 'Glutenhaltiges Getreide', es: 'Cereales con gluten' },
  B: { de: 'Krebstiere', es: 'Crustáceos' },
  C: { de: 'Eier', es: 'Huevos' },
  D: { de: 'Fisch', es: 'Pescado' },
  E: { de: 'Erdnüsse', es: 'Cacahuetes' },
  F: { de: 'Soja', es: 'Soja' },
  G: { de: 'Milch und Laktose', es: 'Leche y lactosa' },
  H: { de: 'Schalenfrüchte (Nüsse)', es: 'Frutos de cáscara' },
  I: { de: 'Sellerie', es: 'Apio' },
  J: { de: 'Senf', es: 'Mostaza' },
  K: { de: 'Sesam', es: 'Sésamo' },
  L: { de: 'Schwefeldioxid und Sulfite', es: 'Dióxido de azufre y sulfitos' },
  M: { de: 'Lupinen', es: 'Altramuces' },
  N: { de: 'Weichtiere', es: 'Moluscos' },
};
