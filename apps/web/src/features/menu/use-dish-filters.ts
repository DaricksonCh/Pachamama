import { MENU_STATUSES, type MenuStatus } from '@pachamama/shared';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { DishFilters } from './api';

export type DishFilterKey = keyof DishFilters;

/** Estado de navegación del listado a la ficha: los filtros (`?…`) para volver con ellos. */
export interface DishListState {
  listSearch: string;
}

/** Ruta del listado con los filtros que traía la navegación (si los hay y son válidos). */
export function dishListPath(state: unknown) {
  const search =
    typeof state === 'object' && state !== null && 'listSearch' in state
      ? state.listSearch
      : undefined;
  return typeof search === 'string' && search.startsWith('?')
    ? `/admin/menu/dishes${search}`
    : '/admin/menu/dishes';
}

/**
 * Filtros del listado de platos guardados en la URL (`?categoryId&status&q&provisional&withoutImage`):
 * se pueden enlazar (p. ej. desde el inicio del panel) y sobreviven a recargar la página.
 * Los valores no válidos se ignoran.
 */
export function useDishFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<DishFilters>(() => {
    const result: DishFilters = {};
    const categoryId = Number(params.get('categoryId'));
    if (Number.isInteger(categoryId) && categoryId > 0) result.categoryId = categoryId;
    const status = params.get('status');
    if ((MENU_STATUSES as readonly string[]).includes(status ?? '')) {
      result.status = status as MenuStatus;
    }
    const q = params.get('q')?.trim();
    if (q) result.q = q;
    if (params.get('provisional') === 'true') result.provisional = true;
    if (params.get('withoutImage') === 'true') result.withoutImage = true;
    return result;
  }, [params]);

  /** Cambia filtros (`undefined` o '' lo quitan). `replace`: sin nueva entrada en el historial. */
  const update = useCallback(
    (patch: Partial<Record<DishFilterKey, string | undefined>>, replace = false) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(patch)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace },
      );
    },
    [setParams],
  );

  const reset = useCallback(() => setParams(new URLSearchParams()), [setParams]);

  return { filters, update, reset };
}
