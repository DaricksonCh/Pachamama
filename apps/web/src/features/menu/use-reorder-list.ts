import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useReorder } from './api';

/**
 * Subir/bajar un elemento de una lista ordenada: envía el orden nuevo, anuncia la posición
 * (texto para una región `role="status"`) y devuelve el foco al botón de la fila movida.
 * Si la API rechaza el orden (lista desfasada), avisa y llama a `onStale` para recargar.
 */
export function useReorderList<T extends { id: number }>(
  kind: 'categories' | 'dishes',
  items: readonly T[] | undefined,
  nameOf: (item: T) => string,
  onStale: () => void,
) {
  const { t } = useTranslation();
  const reorder = useReorder(kind);
  const [announcement, setAnnouncement] = useState('');
  // El foco se restaura tras pintar la lista nueva: `moves` fuerza ese efecto en cada reordenado.
  const pendingFocus = useRef<{ id: number; direction: 'up' | 'down' } | null>(null);
  const [moves, setMoves] = useState(0);

  const move = async (index: number, direction: 'up' | 'down') => {
    if (!items) return;
    const ids = items.map((item) => item.id);
    const target = direction === 'up' ? index - 1 : index + 1;
    const moved = ids[index];
    const other = ids[target];
    if (moved === undefined || other === undefined) return;
    ids[index] = other;
    ids[target] = moved;
    try {
      await reorder.mutateAsync(ids);
      const item = items[index];
      if (item) {
        setAnnouncement(
          t('admin.menu.reorder.moved', {
            name: nameOf(item),
            position: target + 1,
            total: ids.length,
          }),
        );
      }
      pendingFocus.current = { id: moved, direction };
      setMoves((n) => n + 1);
    } catch {
      toast.error(t('admin.menu.errors.reorderFailed'));
      onStale();
    }
  };

  // Tras reordenar, el foco vuelve al botón de la fila movida (si ya está en el extremo, al contrario).
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target || reorder.isPending) return;
    pendingFocus.current = null;
    const find = (direction: string) =>
      document.querySelector<HTMLButtonElement>(
        `[data-reorder="${target.id}-${direction}"]:not(:disabled)`,
      );
    const opposite = target.direction === 'up' ? 'down' : 'up';
    (find(target.direction) ?? find(opposite))?.focus();
  }, [moves, reorder.isPending, items]);

  return { move, announcement, isPending: reorder.isPending };
}
