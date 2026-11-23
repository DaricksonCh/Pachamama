import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/public/page-header';
import { usePageMeta } from '@/components/public/use-page-meta';
import { ReservationWizard } from '@/features/reservations/reservation-wizard';

/** `/de/reservieren`, `/es/reservar`: the booking wizard. */
export function ReservationsPage() {
  const { t } = useTranslation();
  usePageMeta(t('pages.reservations.title'), t('pages.reservations.description'));

  return (
    <>
      <PageHeader title={t('pages.reservations.title')} lead={t('reservations.lead')} />
      <ReservationWizard />
    </>
  );
}
