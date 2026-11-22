import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

/** Subir/bajar con botones (alternativa accesible a arrastrar). `name` rotula cada botón. */
export function ReorderButtons({
  id,
  index,
  total,
  name,
  disabled,
  onMove,
}: {
  /** Identifica la fila: permite devolver el foco al botón tras reordenar. */
  id: number;
  index: number;
  total: number;
  name: string;
  disabled?: boolean;
  onMove: (direction: 'up' | 'down') => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || index === 0}
        data-reorder={`${id}-up`}
        aria-label={t('admin.menu.reorder.up', { name })}
        onClick={() => onMove('up')}
      >
        <ArrowUp aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || index === total - 1}
        data-reorder={`${id}-down`}
        aria-label={t('admin.menu.reorder.down', { name })}
        onClick={() => onMove('down')}
      >
        <ArrowDown aria-hidden="true" />
      </Button>
    </div>
  );
}
