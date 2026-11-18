import { useTranslation } from 'react-i18next';
import { ApiStatus } from '@/features/health/api-status';

/** Página provisional de la fase 2: solo comprueba que web, i18n y API funcionan juntas. */
export function HomePage() {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <p className="text-sm tracking-wide text-brand-600 uppercase">{t('app.tagline')}</p>
      <h1 className="font-display text-4xl font-bold sm:text-5xl">{t('home.title')}</h1>
      <p className="text-lg text-gray-700">{t('home.placeholder')}</p>
      <ApiStatus />
    </section>
  );
}
