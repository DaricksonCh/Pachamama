import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Font } from '@react-pdf/renderer';
import { fonts } from './pdf-theme';

/**
 * Carpeta `assets/` (fuentes y logo). Con `tsx`/Vitest el módulo está en
 * `src/modules/menu/pdf/` → `apps/api/assets`; en el bundle de tsup está en `dist/` → `dist/assets`.
 */
function findAssetsDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(dir, 'assets');
    if (existsSync(join(candidate, 'fonts'))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Menu PDF assets (fonts, logo) not found');
}

export const assetsDir = findAssetsDir();
/**
 * Logo (PNG transparente, 600 px) como datos: react-pdf trataría una ruta de Windows
 * (`C:\...`) como URL e intentaría descargarla.
 */
export const logoPng = { data: readFileSync(join(assetsDir, 'logo.png')), format: 'png' as const };

let registered = false;

/**
 * Registra las fuentes incrustadas (OFL, archivos locales: nunca se piden a internet).
 * Fraunces (serif display) y Work Sans (sans de lectura), subconjunto latino de @fontsource
 * (U+0000–00FF, €, comillas y guiones): cubre alemán y español (ä ö ü ß ñ á « » – €).
 */
function registerPdfFonts() {
  if (registered) return;
  registered = true;
  const file = (name: string) => join(assetsDir, 'fonts', name);
  Font.register({
    family: fonts.display,
    fonts: [
      { src: file('fraunces-latin-400-normal.ttf'), fontWeight: 400 },
      { src: file('fraunces-latin-400-italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
      { src: file('fraunces-latin-600-normal.ttf'), fontWeight: 600 },
    ],
  });
  Font.register({
    family: fonts.body,
    fonts: [
      { src: file('work-sans-latin-400-normal.ttf'), fontWeight: 400 },
      { src: file('work-sans-latin-500-normal.ttf'), fontWeight: 500 },
      { src: file('work-sans-latin-600-normal.ttf'), fontWeight: 600 },
    ],
  });
  // Sin diccionarios de guionado para estas fuentes: nunca partir palabras.
  Font.registerHyphenationCallback((word) => [word]);
}

/** Descarta las fuentes ya cargadas: el siguiente render las vuelve a leer del disco. */
function unloadPdfFonts() {
  const families = Font.getRegisteredFonts();
  for (const family of [fonts.display, fonts.body]) {
    for (const source of families[family]?.sources ?? []) {
      source.data = null;
      source.loadResultPromise = null;
    }
  }
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Ejecuta un render con las fuentes recién cargadas, de uno en uno.
 *
 * react-pdf 4.9 reutiliza los objetos de fontkit entre documentos y un segundo render en el
 * mismo proceso puede salir con glifos de menos (visto: "HORARIO" → "ORARIO" en el PDF en
 * español generado después del alemán). `Font.reset()` no sirve (no borra la carga en caché),
 * así que se descargan las fuentes a mano: los archivos (unos 280 KB) se releen en
 * milisegundos. La cola evita descargarlas a mitad de otro render.
 * Depende de la estructura interna de react-pdf 4.9.0 (`sources[].data/loadResultPromise`): por
 * eso la versión está fijada sin `^` en apps/api/package.json; al actualizarla, revisar este
 * apaño y su test (public-menu-pdf-fonts.test.ts).
 */
export function renderWithFreshFonts<T>(render: () => Promise<T>): Promise<T> {
  const run = queue.then(() => {
    registerPdfFonts();
    unloadPdfFonts();
    return render();
  });
  queue = run.catch(() => undefined);
  return run;
}
