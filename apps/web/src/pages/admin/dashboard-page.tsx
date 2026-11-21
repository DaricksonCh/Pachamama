import type { MenuSummary } from '@pachamama/shared';
import { FileText, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { useMenuSummary } from '@/features/menu/api';
import { menuPdfUrl } from '@/features/menu/pdf-url';

interface SummaryCard {
  key: string;
  to: string;
  labelKey: string;
  hintKey?: string;
  value: (summary: MenuSummary) => number;
}

const CARDS: SummaryCard[] = [
  {
    key: 'visible',
    to: '/admin/menu/dishes?status=visible',
    labelKey: 'admin.dashboard.visibleDishes',
    value: (s) => s.visibleDishes,
  },
  {
    key: 'provisional',
    to: '/admin/menu/dishes?provisional=true',
    labelKey: 'admin.dashboard.provisionalDishes',
    hintKey: 'admin.dashboard.provisionalHint',
    value: (s) => s.provisionalDishes,
  },
  {
    key: 'withoutImage',
    to: '/admin/menu/dishes?withoutImage=true',
    labelKey: 'admin.dashboard.withoutImage',
    hintKey: 'admin.dashboard.withoutImageHint',
    value: (s) => s.dishesWithoutImage,
  },
  {
    key: 'categories',
    to: '/admin/menu/categories',
    labelKey: 'admin.dashboard.categories',
    value: (s) => s.categories,
  },
];

/** Inicio del panel: resumen de la carta con enlaces a los listados filtrados. */
export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const summary = useMenuSummary();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">
          {t('admin.dashboard.welcome', { name: user?.name ?? '' })}
        </h1>
        <p className="text-muted-foreground">{t('admin.dashboard.intro')}</p>
      </header>

      <section
        aria-label={t('admin.dashboard.summaryLabel')}
        aria-busy={summary.isPending}
        className="space-y-3"
      >
        {summary.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CARDS.map((card) => (
              <Skeleton key={card.key} className="h-28 w-full" />
            ))}
            <span className="sr-only" role="status">
              {t('admin.loading')}
            </span>
          </div>
        ) : summary.isError ? (
          <div className="space-y-3">
            <p className="text-destructive" role="alert">
              {t('admin.dashboard.errors.loadFailed')}
            </p>
            <Button
              variant="outline"
              onClick={() => void summary.refetch()}
              disabled={summary.isFetching}
            >
              {t('admin.retry')}
            </Button>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CARDS.map((card) => (
              <li key={card.key}>
                <Link
                  to={card.to}
                  className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Card className="h-full transition-colors hover:bg-muted">
                    <CardHeader>
                      <CardTitle className="text-4xl font-bold tabular-nums">
                        {card.value(summary.data)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p className="font-medium">{t(card.labelKey)}</p>
                      {card.key === 'visible' && summary.data.hiddenDishes > 0 ? (
                        <p className="text-muted-foreground">
                          {t('admin.dashboard.hiddenDishes', { count: summary.data.hiddenDishes })}
                        </p>
                      ) : null}
                      {card.hintKey && card.value(summary.data) > 0 ? (
                        <p className="text-muted-foreground">{t(card.hintKey)} →</p>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="quick-links" className="space-y-3">
        <h2 id="quick-links" className="text-lg font-semibold">
          {t('admin.dashboard.quickLinks')}
        </h2>
        <div className="flex flex-wrap gap-3">
          {user?.role === 'admin' ? (
            <Button asChild>
              <Link to="/admin/menu/dishes/new">
                <Plus aria-hidden="true" />
                {t('admin.dashboard.newDish')}
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <a href={menuPdfUrl(i18n.language)} target="_blank" rel="noopener noreferrer">
              <FileText aria-hidden="true" />
              {t('admin.dashboard.viewPdf')}
              <span className="sr-only">{t('admin.nav.opensInNewTab')}</span>
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
