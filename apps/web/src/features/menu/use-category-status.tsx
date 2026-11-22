import type { AdminCategory } from '@pachamama/shared';
import { ApiError } from '@/lib/api';
import { useSaveCategory } from './api';
import { type ArchiveFlow, useArchiveFlow } from './use-archive-flow';

/**
 * Archivar (con confirmación y error 409 dentro del diálogo) y restaurar una categoría.
 * Lo comparten el listado y la ficha. `onArchived` se llama tras archivar con éxito.
 */
export function useCategoryStatus(
  nameOf: (category: AdminCategory) => string,
  onArchived?: () => void,
): ArchiveFlow<AdminCategory> {
  const save = useSaveCategory();
  return useArchiveFlow<AdminCategory>({
    kind: 'category',
    nameOf,
    setStatus: (category, status) => save.mutateAsync({ id: category.id, data: { status } }),
    isPending: save.isPending,
    archiveErrorKey: (err) =>
      err instanceof ApiError && err.code === 'CATEGORY_HAS_DISHES'
        ? 'admin.menu.categories.errors.hasDishes'
        : undefined,
    messages: {
      archived: 'admin.menu.categories.archived',
      restored: 'admin.menu.categories.restored',
    },
    onArchived,
  });
}
