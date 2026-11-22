import { useParams } from 'react-router';
import { ReservationDetail } from '@/features/reservations/admin/reservation-detail';

export function ReservationDetailPage() {
  const { id } = useParams();
  const parsed = id && /^\d+$/.test(id) ? Number(id) : undefined;
  return <ReservationDetail id={parsed} />;
}
