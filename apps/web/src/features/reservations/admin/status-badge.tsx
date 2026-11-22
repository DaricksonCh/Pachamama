import type { ReservationStatus } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STYLES: Record<ReservationStatus, string> = {
  pending: 'border-amber-700/30 bg-amber-50 text-amber-900',
  confirmed: 'border-green-700/30 bg-green-50 text-green-900',
  rejected: 'border-red-700/30 bg-red-50 text-red-900',
  cancelled: 'border-border bg-muted text-muted-foreground',
  completed: 'border-blue-700/30 bg-blue-50 text-blue-900',
  no_show: 'border-orange-700/30 bg-orange-50 text-orange-900',
};

/** Estado de una reserva: siempre con texto (no solo color). */
export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={cn(STYLES[status])}>
      {t(`admin.reservations.status.${status}`)}
    </Badge>
  );
}
