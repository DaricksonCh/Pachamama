import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { db } from '../../db/database';
import { ADMIN, loginCookie, ORIGIN, seedStaffUsers, STAFF } from '../../test/auth-helpers';
import { resetMenuTables } from '../../test/db-helpers';
import { createMenuEvents } from './menu-events';
import { createMenuRepository } from './menu.repository';
import { createMenuService } from './menu.service';

const app = createApp();
const BASE = '/api/v1/admin/menu';
let adminCookie = '';
let staffCookie = '';

const get = (path: string, cookie = adminCookie) =>
  request(app).get(`${BASE}${path}`).set('Cookie', cookie);
const send = (method: 'post' | 'patch' | 'put', path: string, body: object, cookie = adminCookie) =>
  request(app)[method](`${BASE}${path}`).set('Origin', ORIGIN).set('Cookie', cookie).send(body);

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
  const res = await send('post', '/categories', {
    nameDe: 'Vorspeisen',
    nameEs: 'Entradas',
    status: 'visible',
    ...over,
  });
  expect(res.status).toBe(201);
  return res.body.data as { id: number };
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

describe('reglas de estado y categoría', () => {
  it('staff no puede restaurar un plato archivado (403)', async () => {
    const c = await makeCategory();
    const d = await makeDish(c.id);
    await send('patch', `/dishes/${d.id}`, { status: 'archived' });
    const res = await send('patch', `/dishes/${d.id}`, { status: 'visible' }, staffCookie);
    expect(res.status).toBe(403);
    expect((await get(`/dishes/${d.id}`)).body.data.status).toBe('archived');
  });

  it('no se crea ni se mueve un plato a una categoría archivada (400 INVALID_CATEGORY)', async () => {
    const archived = await makeCategory();
    await send('patch', `/categories/${archived.id}`, { status: 'archived' });
    const created = await send('post', '/dishes', dish(archived.id));
    expect(created.status).toBe(400);
    expect(created.body.error.code).toBe('INVALID_CATEGORY');

    const open = await makeCategory();
    const d = await makeDish(open.id);
    const moved = await send('patch', `/dishes/${d.id}`, { categoryId: archived.id });
    expect(moved.status).toBe(400);
    expect(moved.body.error.code).toBe('INVALID_CATEGORY');
  });

  it('una categoría oculta sí admite platos', async () => {
    const hidden = await makeCategory({ status: 'hidden' });
    await makeDish(hidden.id);
  });
});

describe('orden', () => {
  it('el orden de platos exige ids de una misma categoría', async () => {
    const c1 = await makeCategory();
    const c2 = await makeCategory();
    const a = await makeDish(c1.id);
    const b = await makeDish(c2.id);
    const res = await send('put', '/dishes/order', { ids: [a.id, b.id] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ORDER');
  });

  it('ids desconocidos → 400 INVALID_ORDER (categorías y platos)', async () => {
    const c = await makeCategory();
    const d = await makeDish(c.id);
    const cats = await send('put', '/categories/order', { ids: [c.id, 9999] });
    expect(cats.status).toBe(400);
    expect(cats.body.error.code).toBe('INVALID_ORDER');
    const dishes = await send('put', '/dishes/order', { ids: [d.id, 9999] });
    expect(dishes.status).toBe(400);
    expect(dishes.body.error.code).toBe('INVALID_ORDER');
  });

  it('PATCH /categories/abc → 400', async () => {
    expect((await send('patch', '/categories/abc', { status: 'hidden' })).status).toBe(400);
  });
});

describe('carta pública (service)', () => {
  it('solo categorías y platos visibles; una categoría oculta oculta sus platos', async () => {
    const service = createMenuService(createMenuRepository(db), createMenuEvents());
    const shown = await makeCategory({ nameDe: 'Sichtbar' });
    const hidden = await makeCategory({ status: 'hidden', nameDe: 'Versteckt' });
    const archived = await makeCategory({ nameDe: 'Archiv' });
    await makeDish(shown.id, { nameDe: 'Zeigen' });
    await makeDish(shown.id, { nameDe: 'Weg', status: 'hidden' });
    const gone = await makeDish(shown.id, { nameDe: 'Archiviert' });
    await send('patch', `/dishes/${gone.id}`, { status: 'archived' });
    await makeDish(hidden.id, { nameDe: 'Unter Versteckt' });
    await send('patch', `/categories/${archived.id}`, { status: 'archived' });

    const menu = await service.publicMenu();
    expect(menu.categories.map((c) => c.nameDe)).toEqual(['Sichtbar']);
    expect(menu.categories[0]?.dishes.map((d) => d.nameDe)).toEqual(['Zeigen']);
    expect(JSON.stringify(menu)).not.toMatch(/status|isProvisional|provisionalNote/);
  });
});
