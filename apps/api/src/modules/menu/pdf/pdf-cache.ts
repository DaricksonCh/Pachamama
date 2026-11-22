import type { Language } from '@pachamama/shared';

type Deps = {
  render(lang: Language): Promise<Buffer>;
  onMenuChanged(listener: () => void): unknown;
};

/**
 * PDF de la carta en memoria, uno por idioma, hasta el siguiente cambio de la carta.
 *
 * `version` identifica la carta actual (se usa en el ETag): `<arranque>.<n>`. El prefijo de
 * arranque evita que, tras reiniciar el proceso, un ETag antiguo coincida con otra carta.
 * Peticiones simultáneas comparten la misma generación; si falla, se reintenta en la siguiente.
 */
export function createPdfCache({ render, onMenuChanged }: Deps) {
  const boot = Date.now().toString(36);
  let counter = 0;
  let entries = new Map<Language, Promise<Buffer>>();

  onMenuChanged(() => {
    counter += 1;
    entries = new Map();
  });

  return {
    get version() {
      return `${boot}.${counter}`;
    },
    get(lang: Language): Promise<Buffer> {
      const cached = entries.get(lang);
      if (cached) return cached;
      const target = entries;
      const pending = render(lang);
      target.set(lang, pending);
      pending.catch(() => {
        if (target.get(lang) === pending) target.delete(lang);
      });
      return pending;
    },
  };
}

export type PdfCache = ReturnType<typeof createPdfCache>;
