import type { MenuStatus } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STYLES: Record<MenuStatus, string> = {
  visible: 'border-green-700/30 bg-green-50 text-green-900',
  hidden: 'border-amber-700/30 bg-amber-50 text-amber-900',
  archived: 'border-border bg-muted text-muted-foreground',
};

/** Estado de una categoría o plato: siempre con texto (no solo color). */
export function StatusBadge({ status }: { status: MenuStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={cn(STYLES[status])}>
      {t(`admin.menu.status.${status}`)}
    </Badge>
  );
}
