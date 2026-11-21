import type { AdminDish } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useSetDishStatus } from './api';
import { type ArchiveFlow, useArchiveFlow } from './use-archive-flow';

/** Archivar/restaurar un plato (admin) y alternar Visible/Oculto (admin y personal). */
export function useDishStatus(
  nameOf: (dish: AdminDish) => string,
  onArchived?: () => void,
): ArchiveFlow<AdminDish> & { toggleVisible: (dish: AdminDish) => Promise<void> } {
  const { t } = useTranslation();
  const setStatus = useSetDishStatus();
  const flow = useArchiveFlow<AdminDish>({
    kind: 'dish',
    nameOf,
    setStatus: (dish, status) => setStatus.mutateAsync({ id: dish.id, status }),
    isPending: setStatus.isPending,
    messages: { archived: 'admin.menu.dishes.archived', restored: 'admin.menu.dishes.restored' },
    onArchived,
  });

  const toggleVisible = async (dish: AdminDish) => {
    const status = dish.status === 'visible' ? 'hidden' : 'visible';
    try {
      await setStatus.mutateAsync({ id: dish.id, status });
      toast.success(
        t(status === 'visible' ? 'admin.menu.dishes.nowVisible' : 'admin.menu.dishes.nowHidden', {
          name: nameOf(dish),
        }),
      );
    } catch {
      toast.error(t('admin.menu.dishes.errors.statusFailed'));
    }
  };

  return { ...flow, toggleVisible };
}
