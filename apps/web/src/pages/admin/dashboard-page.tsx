import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/features/auth/use-current-user';

/** Inicio del panel. Los módulos (carta, reservas…) se enlazarán aquí en las fases siguientes. */
export function DashboardPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();

  return (
    <section className="space-y-2">
      <h1 className="font-display text-3xl font-bold">
        {t('admin.dashboard.welcome', { name: user?.name ?? '' })}
      </h1>
      <p className="text-gray-700">{t('admin.dashboard.intro')}</p>
    </section>
  );
}
