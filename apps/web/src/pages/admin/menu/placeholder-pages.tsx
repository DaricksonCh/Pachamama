import { useTranslation } from 'react-i18next';

/** Marcador hasta que llegue el listado real de platos. */
export function DishesPage() {
  const { t } = useTranslation();
  return (
    <section className="space-y-2">
      <h1 className="font-display text-3xl font-bold">{t('admin.menu.dishes.title')}</h1>
      <p className="text-muted-foreground">{t('admin.menu.comingSoon')}</p>
    </section>
  );
}
