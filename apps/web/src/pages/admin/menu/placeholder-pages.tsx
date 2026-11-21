import { useTranslation } from 'react-i18next';

function ComingSoon({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-2">
      <h1 className="font-display text-3xl font-bold">{t(titleKey)}</h1>
      <p className="text-muted-foreground">{t('admin.menu.comingSoon')}</p>
    </section>
  );
}

/** Marcadores hasta que lleguen los listados y formularios reales de la carta. */
export function CategoriesPage() {
  return <ComingSoon titleKey="admin.menu.categories.title" />;
}

export function DishesPage() {
  return <ComingSoon titleKey="admin.menu.dishes.title" />;
}
