import type { AdminDish } from '@pachamama/shared';
import { Eye, EyeOff, ImageOff } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { useCategories, useDishes } from '@/features/menu/api';
import { DishFilters } from '@/features/menu/dish-filters';
import { LoadError, LoadingBlock } from '@/features/menu/load-states';
import { ReorderButtons } from '@/features/menu/reorder-buttons';
import { StatusBadge } from '@/features/menu/status-badge';
import { useDishFilters } from '@/features/menu/use-dish-filters';
import { useDishStatus } from '@/features/menu/use-dish-status';
import { useReorderList } from '@/features/menu/use-reorder-list';

export function DishesPage() {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === 'admin';
  const { filters, update, reset } = useDishFilters();
  const { data, isPending, isError, refetch } = useDishes(filters);
  const categories = useCategories();
  const es = i18n.language === 'es';

  const nameOf = (dish: AdminDish) => (es ? dish.nameEs : dish.nameDe);
  const dishStatus = useDishStatus(nameOf);
  // Ordenar solo tiene sentido con la lista completa de una categoría (sin otros filtros).
  const canReorder =
    isAdmin && Object.keys(filters).length === 1 && filters.categoryId !== undefined;
  const reorder = useReorderList('dishes', data, nameOf, () => void refetch());

  const categoryNames = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, es ? c.nameEs : c.nameDe])),
    [categories.data, es],
  );
  const price = useMemo(
    () => new Intl.NumberFormat(es ? 'es-ES' : 'de-DE', { style: 'currency', currency: 'EUR' }),
    [es],
  );
  const hasFilters = Object.keys(filters).length > 0;

  let content;
  if (isPending) {
    content = <LoadingBlock rows={['h-14', 'h-14', 'h-14', 'h-14']} />;
  } else if (isError) {
    content = <LoadError onRetry={() => void refetch()} />;
  } else if (data.length === 0) {
    content = (
      <p className="text-muted-foreground">
        {t(hasFilters ? 'admin.menu.dishes.emptyFiltered' : 'admin.menu.dishes.empty')}
      </p>
    );
  } else {
    content = (
      <Table>
        <caption className="sr-only">{t('admin.menu.dishes.title')}</caption>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.menu.dishes.columns.image')}</TableHead>
            <TableHead>{t('admin.menu.dishes.columns.name')}</TableHead>
            <TableHead>{t('admin.menu.dishes.columns.category')}</TableHead>
            <TableHead className="text-end">{t('admin.menu.dishes.columns.price')}</TableHead>
            <TableHead>{t('admin.menu.dishes.columns.status')}</TableHead>
            <TableHead>{t('admin.menu.dishes.columns.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((dish, index) => {
            const name = nameOf(dish);
            const archived = dish.status === 'archived';
            return (
              <TableRow key={dish.id}>
                <TableCell>
                  {dish.imageUrl ? (
                    // Decorativa: el nombre del plato está en la celda de al lado.
                    <img
                      src={dish.imageUrl.w400}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-16 rounded object-cover"
                    />
                  ) : (
                    <span className="flex aspect-[4/3] w-16 items-center justify-center rounded border border-dashed text-muted-foreground">
                      <ImageOff className="size-4" aria-hidden="true" />
                      <span className="sr-only">{t('admin.menu.dishes.noImage')}</span>
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-medium">{name}</span>
                  {dish.isProvisional ? (
                    <Badge
                      variant="outline"
                      className="ms-2 border-blue-700/30 bg-blue-50 text-blue-900"
                    >
                      {t('admin.menu.dishes.provisional')}
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>
                  {categoryNames.get(dish.categoryId) ?? t('admin.menu.dishes.noCategory')}
                </TableCell>
                <TableCell className="text-end tabular-nums">{price.format(dish.price)}</TableCell>
                <TableCell>
                  <StatusBadge status={dish.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to={`/admin/menu/dishes/${dish.id}`}
                        aria-label={t(isAdmin ? 'admin.menu.editNamed' : 'admin.menu.viewNamed', {
                          name,
                        })}
                      >
                        {t(isAdmin ? 'admin.menu.edit' : 'admin.menu.view')}
                      </Link>
                    </Button>
                    {archived ? null : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={dishStatus.isPending}
                        aria-label={t(
                          dish.status === 'visible'
                            ? 'admin.menu.dishes.hideNamed'
                            : 'admin.menu.dishes.showNamed',
                          { name },
                        )}
                        onClick={() => void dishStatus.toggleVisible(dish)}
                      >
                        {dish.status === 'visible' ? (
                          <EyeOff aria-hidden="true" />
                        ) : (
                          <Eye aria-hidden="true" />
                        )}
                        {t(
                          dish.status === 'visible'
                            ? 'admin.menu.dishes.hide'
                            : 'admin.menu.dishes.show',
                        )}
                      </Button>
                    )}
                    {canReorder ? (
                      <ReorderButtons
                        id={dish.id}
                        index={index}
                        total={data.length}
                        name={name}
                        disabled={reorder.isPending}
                        onMove={(direction) => void reorder.move(index, direction)}
                      />
                    ) : null}
                    {isAdmin && !archived ? (
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={t('admin.menu.archive.actionNamed', { name })}
                        onClick={() => dishStatus.askArchive(dish)}
                      >
                        {t('admin.menu.archive.action')}
                      </Button>
                    ) : null}
                    {isAdmin && archived ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={dishStatus.isPending}
                        aria-label={t('admin.menu.restoreNamed', { name })}
                        onClick={() => void dishStatus.restore(dish)}
                      >
                        {t('admin.menu.restore')}
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">{t('admin.menu.dishes.title')}</h1>
        {isAdmin ? (
          <Button asChild>
            <Link
              to={
                filters.categoryId
                  ? `/admin/menu/dishes/new?categoryId=${filters.categoryId}`
                  : '/admin/menu/dishes/new'
              }
            >
              {t('admin.menu.dishes.new')}
            </Link>
          </Button>
        ) : null}
      </div>

      <DishFilters
        categories={categories.data ?? []}
        filters={filters}
        onChange={update}
        onReset={reset}
      />
      {isAdmin && !canReorder && data && data.length > 1 ? (
        <p className="text-sm text-muted-foreground">{t('admin.menu.dishes.reorderHint')}</p>
      ) : null}

      {content}

      <p role="status" className="sr-only">
        {reorder.announcement}
      </p>
      {dishStatus.dialog}
    </section>
  );
}
