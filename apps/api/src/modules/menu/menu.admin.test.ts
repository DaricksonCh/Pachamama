import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { db } from '../../db/database';
import { ADMIN, loginCookie, ORIGIN, seedStaffUsers, STAFF } from '../../test/auth-helpers';
import { resetMenuTables } from '../../test/db-helpers';

const app = createApp();
const BASE = '/api/v1/admin/menu';
let adminCookie = '';
let staffCookie = '';

const get = (path: string, cookie = adminCookie) =>
  request(app).get(`${BASE}${path}`).set('Cookie', cookie);
const send = (method: 'post' | 'patch' | 'put', path: string, body: object, cookie = adminCookie) =>
  request(app)[method](`${BASE}${path}`).set('Origin', ORIGIN).set('Cookie', cookie).send(body);

const category = (over: object = {}) => ({
  nameDe: 'Vorspeisen',
  nameEs: 'Entradas',
  status: 'visible',
  ...over,
});
const dish = (categoryId: number, over: object = {}) => ({
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

async function makeCategory(over: object = {}) {
  const res = await send('post', '/categories', category(over));
  expect(res.status).toBe(201);
  return res.body.data as { id: number; sortOrder: number };
}
async function makeDish(categoryId: number, over: object = {}) {
  const res = await send('post', '/dishes', dish(categoryId, over));
  expect(res.status).toBe(201);
  return res.body.data as { id: number };
}

beforeAll(async () => {
  await seedStaffUsers();
  adminCookie = await loginCookie(app, ADMIN.email, ADMIN.password);
  staffCookie = await loginCookie(app, STAFF.email, STAFF.password);
});

beforeEach(async () => {
  await resetMenuTables();
});

describe('permisos', () => {
  it('sin sesión → 401', async () => {
    const res = await request(app).get(`${BASE}/categories`);
    expect(res.status).toBe(401);
  });

  it('staff no puede crear categorías (403) pero sí leerlas', async () => {
    const res = await send('post', '/categories', category(), staffCookie);
    expect(res.status).toBe(403);
    expect((await get('/categories', staffCookie)).status).toBe(200);
  });
});

describe('categorías', () => {
  it('se crean al final del orden y se pueden reordenar', async () => {
    const a = await makeCategory({ nameDe: 'A' });
    const b = await makeCategory({ nameDe: 'B' });
    expect(a.sortOrder).toBe(1);
    expect(b.sortOrder).toBe(2);

    const res = await send('put', '/categories/order', { ids: [b.id, a.id] });
    expect(res.status).toBe(204);
    const list = await get('/categories');
    expect(list.body.data.map((c: { id: number }) => c.id)).toEqual([b.id, a.id]);
  });

  it('lista con dishCount y filtra por estado', async () => {
    const a = await makeCategory();
    await makeCategory({ status: 'hidden' });
    await makeDish(a.id);
    const all = await get('/categories');
    expect(all.body.data).toHaveLength(2);
    expect(all.body.data.find((c: { id: number }) => c.id === a.id).dishCount).toBe(1);
    const hidden = await get('/categories?status=hidden');
    expect(hidden.body.data).toHaveLength(1);
  });

  it('GET /:id inexistente → 404 NOT_FOUND', async () => {
    const res = await get('/categories/999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('archivar con platos no archivados → 409; tras archivarlos → 200; restaurar → 200', async () => {
    const c = await makeCategory();
    const d = await makeDish(c.id);

    const blocked = await send('patch', `/categories/${c.id}`, { status: 'archived' });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('CATEGORY_HAS_DISHES');

    expect((await send('patch', `/dishes/${d.id}`, { status: 'archived' })).status).toBe(200);
    const ok = await send('patch', `/categories/${c.id}`, { status: 'archived' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('archived');

    const back = await send('patch', `/categories/${c.id}`, { status: 'visible' });
    expect(back.status).toBe(200);
  });
});

describe('platos', () => {
  it('sin nameEs → 400 con detalle por campo', async () => {
    const c = await makeCategory();
    const { nameEs: _omit, ...body } = dish(c.id);
    const res = await send('post', '/dishes', body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('nameEs');
  });

  it('categoryId inexistente → 400 INVALID_CATEGORY', async () => {
    const res = await send('post', '/dishes', dish(9999));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CATEGORY');
  });

  it("precio '12,90' → 12.9 y alérgenos ordenados", async () => {
    const c = await makeCategory();
    const res = await send(
      'post',
      '/dishes',
      dish(c.id, { price: '12,90', allergens: ['C', 'A'] }),
    );
    expect(res.status).toBe(201);
    expect(res.body.data.price).toBe(12.9);
    expect(res.body.data.allergens).toEqual(['A', 'C']);
    expect(res.body.data.imageUrl).toBeNull();
    expect(res.body.data.sortOrder).toBe(1);
  });

  it('listado: excluye archivados por defecto; filtros status, q, provisional, withoutImage', async () => {
    const c = await makeCategory();
    const causa = await makeDish(c.id, { nameDe: 'Causa Limeña', nameEs: 'Causa Limeña' });
    const arch = await makeDish(c.id, { nameDe: 'Alt', nameEs: 'Alt' });
    await send('patch', `/dishes/${arch.id}`, { status: 'archived' });
    const prov = await makeDish(c.id, { nameDe: 'Prov', nameEs: 'Prov', isProvisional: true });
    await db
      .updateTable('dishes')
      .set({ imageKey: crypto.randomUUID() })
      .where('id', '=', causa.id)
      .execute();

    const ids = (r: { body: { data: { id: number }[] } }) => r.body.data.map((d) => d.id);
    expect(ids(await get('/dishes'))).toEqual([causa.id, prov.id]);
    expect(ids(await get('/dishes?status=archived'))).toEqual([arch.id]);
    expect(ids(await get('/dishes?q=CAUSA'))).toEqual([causa.id]);
    expect(ids(await get('/dishes?q=limena'))).toEqual([causa.id]);
    expect(ids(await get('/dishes?provisional=true'))).toEqual([prov.id]);
    expect(ids(await get('/dishes?withoutImage=true'))).toEqual([prov.id]);
    expect(ids(await get(`/dishes?categoryId=${c.id}`))).toHaveLength(2);
    const withImage = (await get(`/dishes/${causa.id}`)).body.data.imageUrl;
    expect(withImage.w400).toMatch(/^\/uploads\/dishes\/.+-400\.webp$/);
  });

  it('q trata % y _ como texto literal', async () => {
    const c = await makeCategory();
    await makeDish(c.id, { nameDe: 'Plato', nameEs: 'Plato' });
    expect((await get('/dishes?q=%25')).body.data).toHaveLength(0);
    expect((await get('/dishes?q=_lato')).body.data).toHaveLength(0);
  });

  it('el orden de platos se puede cambiar', async () => {
    const c = await makeCategory();
    const a = await makeDish(c.id);
    const b = await makeDish(c.id);
    expect((await send('put', '/dishes/order', { ids: [b.id, a.id] })).status).toBe(204);
    const list = await get('/dishes');
    expect(list.body.data.map((d: { id: number }) => d.id)).toEqual([b.id, a.id]);
  });

  it('GET inexistente → 404; id no numérico → 400', async () => {
    const res = await get('/dishes/999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect((await send('patch', '/dishes/abc', { status: 'hidden' })).status).toBe(400);
    expect((await get('/dishes/abc')).status).toBe(400);
  });

  it('PATCH de alt sin foto → 400 NO_IMAGE', async () => {
    const c = await makeCategory();
    const d = await makeDish(c.id);
    const res = await send('patch', `/dishes/${d.id}`, { imageAltDe: 'Ein Teller' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_IMAGE');
  });

  it('PATCH parcial cambia solo lo enviado', async () => {
    const c = await makeCategory();
    const d = await makeDish(c.id);
    const res = await send('patch', `/dishes/${d.id}`, { price: '8,5', allergens: ['G'] });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ price: 8.5, allergens: ['G'], nameDe: 'Ceviche' });
  });
});

describe('staff en platos', () => {
  it('solo puede alternar visible/oculto', async () => {
    const c = await makeCategory();
    const d = await makeDish(c.id);
    const ok = await send('patch', `/dishes/${d.id}`, { status: 'hidden' }, staffCookie);
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('hidden');
    for (const body of [{ price: 1 }, { status: 'archived' }, { status: 'hidden', price: 1 }]) {
      const res = await send('patch', `/dishes/${d.id}`, body, staffCookie);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });
});

describe('seguridad de entradas', () => {
  it('XSS y SQLi se guardan literalmente y no dañan la tabla', async () => {
    const c = await makeCategory();
    const xss = '<script>alert(1)</script>';
    const sqli = "' OR 1=1 --";
    const res = await send('post', '/dishes', dish(c.id, { nameDe: xss, nameEs: sqli }));
    expect(res.status).toBe(201);
    expect(res.body.data.nameDe).toBe(xss);
    expect(res.body.data.nameEs).toBe(sqli);
    const q = await get(`/dishes?q=${encodeURIComponent(sqli)}`);
    expect(q.body.data).toHaveLength(1);
    const rows = await db.selectFrom('dishes').select('id').execute();
    expect(rows).toHaveLength(1);
  });
});

describe('resumen', () => {
  it('cuenta visibles, ocultos, provisionales, sin foto y categorías', async () => {
    const c = await makeCategory();
    await makeDish(c.id);
    await makeDish(c.id, { status: 'hidden' });
    await makeDish(c.id, { isProvisional: true });
    const arch = await makeDish(c.id);
    await send('patch', `/dishes/${arch.id}`, { status: 'archived' });

    const res = await get('/summary', staffCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      visibleDishes: 2,
      hiddenDishes: 1,
      provisionalDishes: 1,
      dishesWithoutImage: 3,
      categories: 1,
    });
  });
});
