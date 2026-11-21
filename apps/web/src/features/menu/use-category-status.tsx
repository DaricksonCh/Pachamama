import type { AdminCategory } from '@pachamama/shared';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { useSaveCategory } from './api';
import { ArchiveDialog } from './archive-dialog';

/**
 * Archivar (con confirmación y error 409 dentro del diálogo) y restaurar una categoría.
 * Lo comparten el listado y la ficha. `onArchived` se llama tras archivar con éxito.
 */
export function useCategoryStatus(
  nameOf: (category: AdminCategory) => string,
  onArchived?: () => void,
): {
  askArchive: (category: AdminCategory) => void;
  restore: (category: AdminCategory) => Promise<void>;
  isPending: boolean;
  dialog: ReactNode;
} {
  const { t } = useTranslation();
  const save = useSaveCategory();
  // `target` se conserva al cerrar: así el título no se vacía durante la animación de cierre.
  const [target, setTarget] = useState<AdminCategory | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmArchive = async () => {
    if (!target) return;
    setError(null);
    try {
      await save.mutateAsync({ id: target.id, data: { status: 'archived' } });
      toast.success(t('admin.menu.categories.archived'));
      setOpen(false);
      onArchived?.();
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'CATEGORY_HAS_DISHES'
          ? 'admin.menu.categories.errors.hasDishes'
          : 'admin.menu.errors.saveFailed',
      );
    }
  };

  const restore = async (category: AdminCategory) => {
    try {
      await save.mutateAsync({ id: category.id, data: { status: 'hidden' } });
      toast.success(t('admin.menu.categories.restored'));
    } catch {
      toast.error(t('admin.menu.errors.saveFailed'));
    }
  };

  return {
    askArchive: (category) => {
      setError(null);
      setTarget(category);
      setOpen(true);
    },
    restore,
    isPending: save.isPending,
    dialog: (
      <ArchiveDialog
        open={open}
        kind="category"
        name={target ? nameOf(target) : ''}
        error={error}
        pending={save.isPending}
        onConfirm={() => void confirmArchive()}
        onOpenChange={setOpen}
      />
    ),
  };
}
