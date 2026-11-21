import sharp from 'sharp';
import request from 'supertest';
import { extractText } from 'unpdf';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app';
import { ADMIN, loginCookie, ORIGIN, seedStaffUsers } from '../../test/auth-helpers';
import { resetMenuTables } from '../../test/db-helpers';
import { createMenuEvents, menuEvents } from './menu-events';
import { createPdfCache } from './pdf/pdf-cache';

const app = createApp();
const ADMIN_BASE = '/api/v1/admin/menu';
let adminCookie = '';

const send = (method: 'post' | 'patch', path: string, body: object) =>
  request(app)
    [method](`${ADMIN_BASE}${path}`)
    .set('Origin', ORIGIN)
    .set('Cookie', adminCookie)
    .send(body);

async function makeCategory(over: object) {
  const res = await send('post', '/categories', {
    nameDe: 'Vorspeisen',
    nameEs: 'Entradas',
    status: 'visible',
    ...over,
  });
  expect(res.status).toBe(201);
  return res.body.data.id as number;
}

async function makeDish(categoryId: number, over: object) {
  const res = await send('post', '/dishes', {
    categoryId,
    nameDe: 'Ceviche',
    nameEs: 'Ceviche',
    price: 12.5,
    diet: null,
    allergens: [],
    status: 'visible',
    isProvisional: false,
    ...over,
  });
  expect(res.status).toBe(201);
  return res.body.data.id as number;
}

/** Cuerpo binario de supertest como Buffer. */
const binary = (req: request.Test) =>
  req.buffer(true).parse((res, cb) => {
    const chunks: Buffer[] = [];
    res.on('data', (c: Buffer) => chunks.push(c));
    res.on('end', () => cb(null, Buffer.concat(chunks)));
  });

async function pdfText(pdf: Buffer) {
  const { text } = await extractText(new Uint8Array(pdf), { mergePages: true });
  // NBSP y saltos de línea → espacios simples.
  return text.replace(/\s+/g, ' ');
}

let visibleCat = 0;
let causaId = 0;

beforeAll(async () => {
  await seedStaffUsers();
  adminCookie = await loginCookie(app, ADMIN.email, ADMIN.password);
});

beforeEach(async () => {
  await resetMenuTables();
  // El vaciado directo en BD no pasa por el service: avisar a la caché del PDF.
  menuEvents.emitMenuChanged();

  visibleCat = await makeCategory({ nameDe: 'Vorspeisen', nameEs: 'Entradas' });
  causaId = await makeDish(visibleCat, {
    nameDe: 'Causa Limeña',
    nameEs: 'Causa Limeña',
    descriptionDe: 'Kartoffelterrine mit Hähnchen',
    descriptionEs: 'Terrina de papa con pollo',
    price: 13,
    diet: 'vegetarian',
    allergens: ['C', 'G'],
    isProvisional: true,
    provisionalNote: 'Preis prüfen',
  });
  await makeDish(visibleCat, { nameDe: 'Anticucho-Spieß', nameEs: 'Anticucho', price: 9.9 });
  await makeDish(visibleCat, { nameDe: 'Versteckt', nameEs: 'Oculto', status: 'hidden' });
  const archived = await makeDish(visibleCat, { nameDe: 'Archiviert', nameEs: 'Archivado' });
  expect((await send('patch', `/dishes/${archived}`, { status: 'archived' })).status).toBe(200);

  const hiddenCat = await makeCategory({ nameDe: 'Geheim', nameEs: 'Secreto', status: 'hidden' });
  await makeDish(hiddenCat, { nameDe: 'In versteckter Kategorie', nameEs: 'En oculta' });
});

describe('GET /api/v1/menu', () => {
  it('devuelve solo categorías y platos visibles, sin campos internos', async () => {
    const res = await request(app).get('/api/v1/menu');
    expect(res.status).toBe(200);
    const { categories } = res.body.data;
    expect(categories).toHaveLength(1);
    expect(categories[0].id).toBe(visibleCat);
    expect(categories[0].dishes.map((d: { nameDe: string }) => d.nameDe)).toEqual([
      'Causa Limeña',
      'Anticucho-Spieß',
    ]);

    const json = JSON.stringify(res.body);
    for (const key of ['status', 'isProvisional', 'provisionalNote', 'sortOrder']) {
      expect(json).not.toContain(`"${key}"`);
    }
    expect(json).not.toContain('Preis prüfen');
  });

  it('Cache-Control: no-cache + ETag; If-None-Match igual → 304', async () => {
    const res = await request(app).get('/api/v1/menu');
    expect(res.headers['cache-control']).toBe('no-cache');
    const etag = res.headers.etag;
    expect(etag).toMatch(/^".+"$/);

    const again = await request(app).get('/api/v1/menu').set('If-None-Match', etag!);
    expect(again.status).toBe(304);
  });

  it('el ETag cambia cuando cambia la carta', async () => {
    const before = (await request(app).get('/api/v1/menu')).headers.etag;
    await send('patch', `/dishes/${causaId}`, { price: 14 });
    const after = await request(app).get('/api/v1/menu').set('If-None-Match', before!);
    expect(after.status).toBe(200);
    expect(after.headers.etag).not.toBe(before);
  });
});

describe('GET /api/v1/menu/pdf', () => {
  it('?lang=es → PDF en español con nombre de archivo y caché correctos', async () => {
    const res = await binary(request(app).get('/api/v1/menu/pdf?lang=es'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('pachamama-carta-es.pdf');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers.etag).toMatch(/-es"$/);
    const body = res.body as Buffer;
    expect(body.subarray(0, 4).toString('latin1')).toBe('%PDF');

    const text = await pdfText(body);
    expect(text).toContain('Causa Limeña');
    expect(text).toContain('Entradas');
    expect(text).toContain('13,00 €');
    expect(text).toContain('Alérgenos');
    expect(text).not.toContain('Oculto');
    expect(text).not.toContain('En oculta');
    expect(text).not.toContain('Archivado');
  });

  it('idioma ausente o inválido → alemán', async () => {
    const bad = await binary(request(app).get('/api/v1/menu/pdf?lang=xx'));
    expect(bad.status).toBe(200);
    expect(bad.headers['content-disposition']).toContain('pachamama-karte-de.pdf');
    expect(bad.headers.etag).toMatch(/-de"$/);

    const none = await binary(request(app).get('/api/v1/menu/pdf'));
    expect(none.headers['content-disposition']).toContain('pachamama-karte-de.pdf');
    const text = await pdfText(none.body as Buffer);
    expect(text).toContain('Spieß');
    expect(text).toContain('Vorspeisen');
    expect(text).toContain('Allergene');
  });

  it('If-None-Match igual → 304 sin cuerpo', async () => {
    const first = await binary(request(app).get('/api/v1/menu/pdf?lang=de'));
    const again = await request(app)
      .get('/api/v1/menu/pdf?lang=de')
      .set('If-None-Match', first.headers.etag!);
    expect(again.status).toBe(304);
  });

  it('tras cambiar el precio: ETag nuevo y PDF con el precio nuevo', async () => {
    const first = await binary(request(app).get('/api/v1/menu/pdf?lang=de'));
    expect(await pdfText(first.body as Buffer)).toContain('13,00 €');

    expect((await send('patch', `/dishes/${causaId}`, { price: 15.5 })).status).toBe(200);

    const second = await binary(
      request(app).get('/api/v1/menu/pdf?lang=de').set('If-None-Match', first.headers.etag!),
    );
    expect(second.status).toBe(200);
    expect(second.headers.etag).not.toBe(first.headers.etag);
    const text = await pdfText(second.body as Buffer);
    expect(text).toContain('15,50 €');
    expect(text).not.toContain('13,00 €');
  });

  it('con una foto pesa menos de 3 MB', async () => {
    const without = await binary(request(app).get('/api/v1/menu/pdf?lang=de'));
    const sizeWithout = (without.body as Buffer).length;

    // Foto con ruido (se comprime mal, como una foto real).
    const noise = Buffer.alloc(2400 * 1600 * 3);
    for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24;
    const jpeg = await sharp(noise, { raw: { width: 2400, height: 1600, channels: 3 } })
      .jpeg({ quality: 92 })
      .toBuffer();
    const up = await request(app)
      .put(`${ADMIN_BASE}/dishes/${causaId}/image`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .field('altDe', 'Causa')
      .field('altEs', 'Causa')
      .attach('image', jpeg, { filename: 'causa.jpg', contentType: 'image/jpeg' });
    expect(up.status).toBe(200);

    const res = await binary(request(app).get('/api/v1/menu/pdf?lang=de'));
    expect(res.status).toBe(200);
    const size = (res.body as Buffer).length;
    expect(size).toBeLessThan(3 * 1024 * 1024);
    // La foto está incrustada: el PDF crece respecto al de sin foto.
    expect(size).toBeGreaterThan(sizeWithout + 20 * 1024);
  });
});

describe('createPdfCache', () => {
  function setup(render: (lang: 'de' | 'es') => Promise<Buffer>) {
    const events = createMenuEvents();
    const cache = createPdfCache({ render, onMenuChanged: events.onMenuChanged });
    return { events, cache };
  }

  it('genera una vez por idioma y comparte peticiones simultáneas', async () => {
    const render = vi.fn(async (lang: string) => Buffer.from(lang));
    const { cache } = setup(render);
    const [a, b] = await Promise.all([cache.get('de'), cache.get('de')]);
    expect(a).toBe(b);
    await cache.get('es');
    await cache.get('de');
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('un cambio de la carta sube la versión y vacía la caché', async () => {
    const render = vi.fn(async () => Buffer.from('x'));
    const { cache, events } = setup(render);
    const v0 = cache.version;
    await cache.get('de');
    events.emitMenuChanged();
    expect(cache.version).not.toBe(v0);
    await cache.get('de');
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('si la generación falla, la siguiente petición lo reintenta', async () => {
    const render = vi
      .fn<(lang: 'de' | 'es') => Promise<Buffer>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(Buffer.from('ok'));
    const { cache } = setup(render);
    await expect(cache.get('de')).rejects.toThrow('boom');
    await expect(cache.get('de')).resolves.toEqual(Buffer.from('ok'));
  });
});
