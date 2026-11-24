import { DEFAULT_LANGUAGE, isSupportedLanguage, type Language } from '@pachamama/shared';
import { type Request, type Response, Router } from 'express';
import { env } from '../../config/env';
import { pdfLimiter } from '../../middlewares/rate-limit';
import { menuEvents } from './menu-events';
import { menuService } from './menu.routes';
import type { MenuService } from './menu.service';
import { pdfLabels } from './pdf/labels';
import { renderMenuPdf } from './pdf/menu-pdf';
import { createPdfCache, type PdfCache } from './pdf/pdf-cache';
import { loadDishPhotos } from './pdf/photos';

/**
 * Carta pública: datos sin información personal → se puede cachear, pero siempre revalidando
 * (`no-cache` + ETag) para que un cambio en el panel se vea al momento.
 * Devuelve true si el cliente ya tiene esta versión (304 enviado).
 */
function notModified(req: Request, res: Response, etag: string): boolean {
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('ETag', etag);
  if (req.fresh) {
    res.status(304).end();
    return true;
  }
  return false;
}

export function createPublicMenuRouter(service: MenuService, pdfCache: PdfCache) {
  const router = Router();

  router.get('/', async (req, res) => {
    if (notModified(req, res, `"${pdfCache.version}-json"`)) return;
    res.json({ data: await service.publicMenu() });
  });

  router.get('/pdf', pdfLimiter(env.RATE_LIMIT_PDF_PER_MIN), async (req, res) => {
    const lang: Language = isSupportedLanguage(req.query.lang) ? req.query.lang : DEFAULT_LANGUAGE;
    if (notModified(req, res, `"${pdfCache.version}-${lang}"`)) return;
    const pdf = await pdfCache.get(lang);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${pdfLabels[lang].fileName}"`);
    res.send(pdf);
  });

  return router;
}

export const menuPdfCache = createPdfCache({
  onMenuChanged: menuEvents.onMenuChanged,
  async render(lang) {
    const menu = await menuService.publicMenu();
    const photos = await loadDishPhotos(menu, env.UPLOADS_DIR);
    return renderMenuPdf({ menu, lang, photos });
  },
});

/** /api/v1/menu — carta pública (JSON y PDF). */
export const publicMenuRouter = createPublicMenuRouter(menuService, menuPdfCache);
