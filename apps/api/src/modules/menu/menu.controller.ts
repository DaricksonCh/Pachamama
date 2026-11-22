import {
  categoryInputSchema,
  categoryUpdateSchema,
  dishInputSchema,
  dishUpdateSchema,
  imageAltSchema,
  MENU_STATUSES,
  reorderSchema,
} from '@pachamama/shared';
import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/app-error';
import type { MenuService } from './menu.service';

/** Valida con Zod; en error → 400 con el detalle por campo para el formulario. */
function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Invalid input',
      z.flattenError(result.error).fieldErrors,
    );
  }
  return result.data;
}

const idParam = z.coerce.number().int().positive();
const flag = z.enum(['true', 'false']).transform((v) => v === 'true');

const dishQuerySchema = z.object({
  categoryId: idParam.optional(),
  status: z.enum(MENU_STATUSES).optional(),
  q: z.string().trim().max(120).optional(),
  provisional: flag.optional(),
  withoutImage: flag.optional(),
});
const categoryQuerySchema = z.object({ status: z.enum(MENU_STATUSES).optional() });

const id = (req: Request) => parse(idParam, req.params.id);

export function createMenuController(service: MenuService) {
  const summary: RequestHandler = async (_req, res) => {
    res.json({ data: await service.summary() });
  };

  const listCategories: RequestHandler = async (req, res) => {
    const { status } = parse(categoryQuerySchema, req.query);
    res.json({ data: await service.listCategories(status) });
  };
  const getCategory: RequestHandler = async (req, res) => {
    res.json({ data: await service.getCategory(id(req)) });
  };
  const createCategory: RequestHandler = async (req, res) => {
    const data = await service.createCategory(parse(categoryInputSchema, req.body));
    res.status(201).json({ data });
  };
  const updateCategory: RequestHandler = async (req, res) => {
    const data = await service.updateCategory(id(req), parse(categoryUpdateSchema, req.body));
    res.json({ data });
  };
  const reorderCategories: RequestHandler = async (req, res) => {
    await service.reorderCategories(parse(reorderSchema, req.body).ids);
    res.status(204).end();
  };

  const listDishes: RequestHandler = async (req, res) => {
    res.json({ data: await service.listDishes(parse(dishQuerySchema, req.query)) });
  };
  const getDish: RequestHandler = async (req, res) => {
    res.json({ data: await service.getDish(id(req)) });
  };
  const createDish: RequestHandler = async (req, res) => {
    const data = await service.createDish(parse(dishInputSchema, req.body));
    res.status(201).json({ data });
  };
  const updateDish: RequestHandler = async (req, res) => {
    const role = res.locals.session?.user.role;
    const data = await service.updateDish(id(req), parse(dishUpdateSchema, req.body), role);
    res.json({ data });
  };
  const setDishImage: RequestHandler = async (req, res) => {
    const alt = parse(imageAltSchema, req.body);
    if (!req.file) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Image file required', {
        image: ['validation.required'],
      });
    }
    res.json({ data: await service.setDishImage(id(req), req.file.buffer, alt) });
  };
  const removeDishImage: RequestHandler = async (req, res) => {
    res.json({ data: await service.removeDishImage(id(req)) });
  };
  const reorderDishes: RequestHandler = async (req, res) => {
    await service.reorderDishes(parse(reorderSchema, req.body).ids);
    res.status(204).end();
  };

  return {
    summary,
    listCategories,
    getCategory,
    createCategory,
    updateCategory,
    reorderCategories,
    listDishes,
    getDish,
    createDish,
    updateDish,
    reorderDishes,
    setDishImage,
    removeDishImage,
  };
}

export type MenuController = ReturnType<typeof createMenuController>;
