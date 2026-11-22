import { existsSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { ADMIN, loginCookie, ORIGIN, seedStaffUsers, STAFF } from '../../../test/auth-helpers';
import { resetMenuTables } from '../../../test/db-helpers';
import { db } from '../../../db/database';
import { createMenuEvents } from '../menu-events';
import { createMenuRepository } from '../menu.repository';
import { createMenuService } from '../menu.service';
import { createDiskImageStorage } from './image-storage';
import { processDishImage } from './image-processor';

const app = createApp();
const BASE = '/api/v1/admin/menu';
let adminCookie = '';
let staffCookie = '';
let dishId = 0;

/** JPEG con orientación EXIF 6 (se muestra girado) y GPS. */
async function jpegWithExif(width = 2400, height = 1800) {
  return sharp({ create: { width, height, channels: 3, background: '#cc3333' } })
    .jpeg()
    .withMetadata({
      orientation: 6,
      exif: {
        IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '52/1 30/1 0/1' },
      },
    })
    .toBuffer();
}

async function makeDish() {
  const cat = await request(app)
    .post(`${BASE}/categories`)
    .set('Origin', ORIGIN)
    .set('Cookie', adminCookie)
    .send({ nameDe: 'Vorspeisen', nameEs: 'Entradas', status: 'visible' });
  const res = await request(app)
    .post(`${BASE}/dishes`)
    .set('Origin', ORIGIN)
    .set('Cookie', adminCookie)
    .send({
      categoryId: cat.body.data.id,
      nameDe: 'Ceviche',
      nameEs: 'Ceviche',
      price: 12.5,
      diet: null,
      allergens: [],
      status: 'visible',
      isProvisional: false,
    });
  return res.body.data.id as number;
}

type UploadOpts = {
  filename?: string;
  type?: string;
  fields?: Record<string, string>;
  cookie?: string;
  origin?: boolean;
};

function upload(file: Buffer | null, opts: UploadOpts = {}) {
  const { filename = 'foto.jpg', type = 'image/jpeg', cookie = adminCookie, origin = true } = opts;
  const fields = opts.fields ?? { altDe: 'Ein Ceviche', altEs: 'Un ceviche' };
  let req = request(app).put(`${BASE}/dishes/${dishId}/image`).set('Cookie', cookie);
  if (origin) req = req.set('Origin', ORIGIN);
  for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
  if (file) req = req.attach('image', file, { filename, contentType: type });
  return req;
}

const filesOf = (url: { w400: string; w800: string; w1600: string }) =>
  [url.w400, url.w800, url.w1600].map((u) => join(env.UPLOADS_DIR, u.replace('/uploads/', '')));

beforeAll(async () => {
  await seedStaffUsers();
  adminCookie = await loginCookie(app, ADMIN.email, ADMIN.password);
  staffCookie = await loginCookie(app, STAFF.email, STAFF.password);
});

beforeEach(async () => {
  await resetMenuTables();
  dishId = await makeDish();
});

describe('processDishImage', () => {
  it('genera 3 WebP sin metadatos, rotados según EXIF', async () => {
    const input = await jpegWithExif();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const out = await processDishImage(await jpegWithExif());
    expect(out.map((v) => v.width)).toEqual([400, 800, 1600]);
    for (const v of out) {
      const meta = await sharp(v.data).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.exif).toBeUndefined();
      expect(meta.width).toBe(v.width);
      // original 2400x1800 con orientación 6 → vertical (alto > ancho)
      expect(meta.height!).toBeGreaterThan(meta.width!);
    }
  });

  it('no amplía imágenes pequeñas', async () => {
    const out = await processDishImage(await jpegWithExif(300, 200));
    for (const v of out) {
      expect((await sharp(v.data).metadata()).width!).toBeLessThanOrEqual(300);
    }
  });
});

describe('PUT /admin/menu/dishes/:id/image', () => {
  it('sube un JPEG: 200, archivos creados y servidos con caché immutable', async () => {
    const res = await upload(await jpegWithExif());
    expect(res.status).toBe(200);
    expect(res.body.data.imageAltEs).toBe('Un ceviche');
    for (const f of filesOf(res.body.data.imageUrl)) expect(existsSync(f)).toBe(true);
    const img = await request(app).get(res.body.data.imageUrl.w800);
    expect(img.status).toBe(200);
    expect(img.headers['cache-control']).toContain('immutable');
  });

  it('acepta PNG', async () => {
    const png = await sharp({
      create: { width: 900, height: 600, channels: 3, background: '#00aa00' },
    })
      .png()
      .toBuffer();
    const res = await upload(png, { filename: 'a.png', type: 'image/png' });
    expect(res.status).toBe(200);
  });

  it('HEIC falso → 415 UNSUPPORTED_IMAGE', async () => {
    const fake = Buffer.alloc(1024);
    fake.write('ftypheic', 4, 'ascii');
    const res = await upload(fake, { filename: 'a.heic', type: 'image/heic' });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_IMAGE');
  });

  it('.txt renombrado a .jpg → 415', async () => {
    const res = await upload(Buffer.from('hola, esto no es una imagen'));
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_IMAGE');
  });

  it('sin altEs → 400', async () => {
    const res = await upload(await jpegWithExif(), { fields: { altDe: 'Ein Ceviche' } });
    expect(res.status).toBe(400);
  });

  it('sin archivo → 400', async () => {
    const res = await upload(null);
    expect(res.status).toBe(400);
  });

  it('11 MB → 413 IMAGE_TOO_LARGE', async () => {
    const res = await upload(Buffer.alloc(11 * 1024 * 1024, 1));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('IMAGE_TOO_LARGE');
  });

  it('staff → 403; sin Origin → 403; plato inexistente → 404', async () => {
    const jpeg = await jpegWithExif(600, 400);
    expect((await upload(jpeg, { cookie: staffCookie })).status).toBe(403);
    expect((await upload(jpeg, { origin: false })).status).toBe(403);
    const missing = await request(app)
      .put(`${BASE}/dishes/999999/image`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .field('altDe', 'a')
      .field('altEs', 'b')
      .attach('image', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(missing.status).toBe(404);
  });

  it('reemplazar la foto borra los archivos anteriores', async () => {
    const first = await upload(await jpegWithExif(1000, 800));
    const oldFiles = filesOf(first.body.data.imageUrl);
    const second = await upload(await jpegWithExif(1000, 800));
    expect(second.status).toBe(200);
    expect(second.body.data.imageUrl.w400).not.toBe(first.body.data.imageUrl.w400);
    for (const f of oldFiles) expect(existsSync(f)).toBe(false);
    for (const f of filesOf(second.body.data.imageUrl)) expect(existsSync(f)).toBe(true);
  });
});

describe('DELETE /admin/menu/dishes/:id/image', () => {
  it('quita la foto y borra los archivos', async () => {
    const put = await upload(await jpegWithExif(1000, 800));
    const files = filesOf(put.body.data.imageUrl);
    const res = await request(app)
      .delete(`${BASE}/dishes/${dishId}/image`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.imageUrl).toBeNull();
    for (const f of files) expect(existsSync(f)).toBe(false);
  });

  it('staff → 403', async () => {
    const res = await request(app)
      .delete(`${BASE}/dishes/${dishId}/image`)
      .set('Origin', ORIGIN)
      .set('Cookie', staffCookie);
    expect(res.status).toBe(403);
  });
});

describe('/uploads', () => {
  it('no sale del directorio', async () => {
    const secret = 'SENTINEL-' + Math.random().toString(36).slice(2);
    writeFileSync(join(dirname(env.UPLOADS_DIR), 'sentinel'), secret);
    for (const path of [
      '/uploads/../sentinel',
      '/uploads/..%2fsentinel',
      '/uploads/%2e%2e/sentinel',
    ]) {
      const res = await request(app).get(path);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(res.text ?? '').not.toContain(secret);
    }
  });
});

describe('endurecimiento del procesado', () => {
  it('PNG de más de 40 MP (pequeño en disco) → 413 IMAGE_TOO_LARGE', async () => {
    const png = await sharp({
      create: { width: 8000, height: 6000, channels: 3, background: '#808080' },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    expect(png.length).toBeLessThan(10 * 1024 * 1024);
    const res = await upload(png, { filename: 'a.png', type: 'image/png' });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('IMAGE_TOO_LARGE');
  });

  it('SVG → 415', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    const res = await upload(svg, { filename: 'a.svg', type: 'image/svg+xml' });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_IMAGE');
  });

  it('GIF → 415', async () => {
    const gif = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#fff' } })
      .gif()
      .toBuffer();
    const res = await upload(gif, { filename: 'a.gif', type: 'image/gif' });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_IMAGE');
  });

  it('JPEG truncado → 415', async () => {
    const jpeg = await jpegWithExif(1600, 1200);
    const res = await upload(jpeg.subarray(0, Math.floor(jpeg.length / 2)));
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_IMAGE');
  });
});

describe('limpieza de archivos (service)', () => {
  it('si storage.remove falla, la operación sigue y se emite el evento', async () => {
    const events = createMenuEvents();
    let emitted = 0;
    events.onMenuChanged(() => emitted++);
    const saved: string[] = [];
    const service = createMenuService(createMenuRepository(db), events, {
      save: async (key) => void saved.push(key),
      remove: async () => {
        throw new Error('disk error');
      },
    });
    const jpeg = await jpegWithExif(1000, 800);
    const alt = { altDe: 'a', altEs: 'b' };
    await service.setDishImage(dishId, jpeg, alt);
    const replaced = await service.setDishImage(dishId, jpeg, alt);
    expect(replaced.imageUrl).not.toBeNull();
    const removed = await service.removeDishImage(dishId);
    expect(removed.imageUrl).toBeNull();
    expect(emitted).toBe(3);
  });

  it('si storage.save falla a medias, no quedan archivos (disco)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pachamama-partial-'));
    const storage = createDiskImageStorage(dir);
    await expect(
      storage.save('k', [
        { width: 400, data: Buffer.from('x') },
        { width: 800, data: undefined as unknown as Buffer },
      ]),
    ).rejects.toThrow();
    expect(existsSync(join(dir, 'dishes', 'k-400.webp'))).toBe(false);
  });
});
