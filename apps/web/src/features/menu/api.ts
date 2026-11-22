import {
  adminCategorySchema,
  adminDishSchema,
  type CategoryInput,
  type CategoryUpdate,
  type DishInput,
  type DishUpdate,
  type MenuStatus,
  menuSummarySchema,
} from '@pachamama/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet, apiSend } from '@/lib/api';

const BASE = '/api/v1/admin/menu';

export interface DishFilters {
  categoryId?: number;
  status?: MenuStatus;
  q?: string;
  provisional?: boolean;
  withoutImage?: boolean;
}

/** Claves de consulta de la carta: todas cuelgan de `all` para invalidarlas juntas. */
export const menuKeys = {
  all: ['admin', 'menu'] as const,
  summary: () => [...menuKeys.all, 'summary'] as const,
  categories: (status?: MenuStatus) => [...menuKeys.all, 'categories', { status }] as const,
  category: (id: number) => [...menuKeys.all, 'category', id] as const,
  dishes: (filters: DishFilters) => [...menuKeys.all, 'dishes', filters] as const,
  dish: (id: number) => [...menuKeys.all, 'dish', id] as const,
};

function queryString(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

const summaryResponse = z.object({ data: menuSummarySchema });
const categoriesResponse = z.object({ data: z.array(adminCategorySchema) });
const categoryResponse = z.object({ data: adminCategorySchema });
const dishesResponse = z.object({ data: z.array(adminDishSchema) });
const dishResponse = z.object({ data: adminDishSchema });

export function useMenuSummary() {
  return useQuery({
    queryKey: menuKeys.summary(),
    queryFn: async ({ signal }) =>
      (await apiGet(`${BASE}/summary`, summaryResponse, { signal })).data,
  });
}

export function useCategories(status?: MenuStatus) {
  return useQuery({
    queryKey: menuKeys.categories(status),
    queryFn: async ({ signal }) =>
      (await apiGet(`${BASE}/categories${queryString({ status })}`, categoriesResponse, { signal }))
        .data,
  });
}

export function useCategory(id: number | undefined) {
  return useQuery({
    queryKey: menuKeys.category(id ?? 0),
    enabled: id !== undefined,
    queryFn: async ({ signal }) =>
      (await apiGet(`${BASE}/categories/${id}`, categoryResponse, { signal })).data,
  });
}

export function useDishes(filters: DishFilters) {
  return useQuery({
    queryKey: menuKeys.dishes(filters),
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) =>
      (await apiGet(`${BASE}/dishes${queryString({ ...filters })}`, dishesResponse, { signal }))
        .data,
  });
}

export function useDish(id: number | undefined) {
  return useQuery({
    queryKey: menuKeys.dish(id ?? 0),
    enabled: id !== undefined,
    queryFn: async ({ signal }) =>
      (await apiGet(`${BASE}/dishes/${id}`, dishResponse, { signal })).data,
  });
}

/** Toda escritura invalida la carta entera (resumen, listados y fichas). */
function useInvalidatingMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: menuKeys.all }),
  });
}

/** Crea (sin `id`) o actualiza (con `id`) una categoría. */
export function useSaveCategory() {
  return useInvalidatingMutation(
    async ({ id, data }: { id?: number; data: CategoryInput | CategoryUpdate }) =>
      id === undefined
        ? (await apiSend('POST', `${BASE}/categories`, data, categoryResponse)).data
        : (await apiSend('PATCH', `${BASE}/categories/${id}`, data, categoryResponse)).data,
  );
}

/** Crea (sin `id`) o actualiza (con `id`) un plato. */
export function useSaveDish() {
  return useInvalidatingMutation(
    async ({ id, data }: { id?: number; data: DishInput | DishUpdate }) =>
      id === undefined
        ? (await apiSend('POST', `${BASE}/dishes`, data, dishResponse)).data
        : (await apiSend('PATCH', `${BASE}/dishes/${id}`, data, dishResponse)).data,
  );
}

/** Reordena categorías o platos: `ids` en el orden nuevo. */
export function useReorder(kind: 'categories' | 'dishes') {
  return useInvalidatingMutation(async (ids: number[]) => {
    await apiSend('PUT', `${BASE}/${kind}/order`, { ids });
  });
}

/** Cambia solo el estado de un plato (también lo puede hacer el personal). */
export function useSetDishStatus() {
  return useInvalidatingMutation(
    async ({ id, status }: { id: number; status: MenuStatus }) =>
      (await apiSend('PATCH', `${BASE}/dishes/${id}`, { status }, dishResponse)).data,
  );
}

export function useUploadDishImage() {
  return useInvalidatingMutation(
    async ({
      id,
      file,
      altDe,
      altEs,
    }: {
      id: number;
      file: File;
      altDe: string;
      altEs: string;
    }) => {
      const form = new FormData();
      form.set('image', file);
      form.set('altDe', altDe);
      form.set('altEs', altEs);
      return (await apiSend('PUT', `${BASE}/dishes/${id}/image`, form, dishResponse)).data;
    },
  );
}

export function useRemoveDishImage() {
  return useInvalidatingMutation(async (id: number) => {
    await apiSend('DELETE', `${BASE}/dishes/${id}/image`);
  });
}
