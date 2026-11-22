import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArchiveDialog } from './archive-dialog';

export interface ArchiveFlow<T> {
  askArchive: (item: T) => void;
  restore: (item: T) => Promise<void>;
  isPending: boolean;
  dialog: ReactNode;
}

/**
 * Archivar (con diálogo de confirmación; un error del servidor se muestra dentro del diálogo,
 * que sigue abierto) y restaurar. Base común de categorías y platos (listado y ficha).
 */
export function useArchiveFlow<T>({
  kind,
  nameOf,
  setStatus,
  isPending,
  archiveErrorKey,
  messages,
  onArchived,
}: {
  kind: 'category' | 'dish';
  nameOf: (item: T) => string;
  setStatus: (item: T, status: 'archived' | 'hidden') => Promise<unknown>;
  isPending: boolean;
  /** Clave i18n del error al archivar (por defecto, "no se pudo guardar"). */
  archiveErrorKey?: (err: unknown) => string | undefined;
  messages: { archived: string; restored: string };
  onArchived?: () => void;
}): ArchiveFlow<T> {
  const { t } = useTranslation();
  // `target` se conserva al cerrar: así el título no se vacía durante la animación de cierre.
  const [target, setTarget] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmArchive = async () => {
    if (!target) return;
    setError(null);
    try {
      await setStatus(target, 'archived');
      toast.success(t(messages.archived));
      setOpen(false);
      onArchived?.();
    } catch (err) {
      setError(archiveErrorKey?.(err) ?? 'admin.menu.errors.saveFailed');
    }
  };

  const restore = async (item: T) => {
    try {
      await setStatus(item, 'hidden');
      toast.success(t(messages.restored));
    } catch {
      toast.error(t('admin.menu.errors.saveFailed'));
    }
  };

  return {
    askArchive: (item) => {
      setError(null);
      setTarget(item);
      setOpen(true);
    },
    restore,
    isPending,
    dialog: (
      <ArchiveDialog
        open={open}
        kind={kind}
        name={target ? nameOf(target) : ''}
        error={error}
        pending={isPending}
        onConfirm={() => void confirmArchive()}
        onOpenChange={setOpen}
      />
    ),
  };
}
