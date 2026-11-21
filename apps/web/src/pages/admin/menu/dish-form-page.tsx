import type { AdminDish } from '@pachamama/shared';
import { Archive, ArrowLeft, RotateCcw } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { useCategories, useDish } from '@/features/menu/api';
import { DishForm } from '@/features/menu/dish-form';
import { LoadError, LoadingBlock } from '@/features/menu/load-states';
import { StatusBadge } from '@/features/menu/status-badge';
import { useDishStatus } from '@/features/menu/use-dish-status';
import { ApiError } from '@/lib/api';

const FORM_SKELETON = ['h-9', 'h-9', 'h-20', 'h-9', 'h-32'];

export function DishFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const [search] = useSearchParams();
  const { data: user } = useCurrentUser();
  const isNew = params.id === undefined;
  const id = isNew ? undefined : Number(params.id);
  const validId = id !== undefined && Number.isInteger(id) && id > 0;
  const dishQuery = useDish(validId ? id : undefined);
  const categories = useCategories();
  const defaultCategoryId = Number(search.get('categoryId')) || undefined;

  const readOnly = user?.role !== 'admin';
  const goBack = useCallback(() => void navigate('/admin/menu/dishes'), [navigate]);
  // Alta con foto fallida: el plato ya existe, se sigue en su ficha para reintentar la foto.
  const editCreated = useCallback(
    (created: AdminDish) => void navigate(`/admin/menu/dishes/${created.id}`, { replace: true }),
    [navigate],
  );
  const nameOf = (d: AdminDish) => (i18n.language === 'es' ? d.nameEs : d.nameDe);
  const dishStatus = useDishStatus(nameOf, goBack);
  const dish = dishQuery.data;

  let title = t('admin.menu.dishes.new');
  if (!isNew) title = dish ? nameOf(dish) : t('admin.menu.dishes.edit');

  let body;
  if (isNew && readOnly) {
    body = <p role="alert">{t('admin.menu.errors.forbidden')}</p>;
  } else if (
    !isNew &&
    (!validId || (dishQuery.error instanceof ApiError && dishQuery.error.status === 404))
  ) {
    body = <p role="alert">{t('admin.menu.dishes.notFound')}</p>;
  } else if ((!isNew && dishQuery.isPending) || categories.isPending) {
    body = <LoadingBlock rows={FORM_SKELETON} className="max-w-3xl space-y-4" />;
  } else if (dishQuery.error || categories.error) {
    body = (
      <LoadError
        onRetry={() => {
          if (dishQuery.error) void dishQuery.refetch();
          if (categories.error) void categories.refetch();
        }}
      />
    );
  } else if (isNew || !dish) {
    body = (
      <DishForm
        categories={categories.data}
        defaultCategoryId={defaultCategoryId}
        onSaved={goBack}
        onCreatedWithoutImage={editCreated}
      />
    );
  } else {
    body = (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={dish.status} />
          {dish.status === 'archived' ? (
            <p className="text-sm text-muted-foreground">{t('admin.menu.dishes.archivedNotice')}</p>
          ) : null}
          {readOnly ? null : dish.status === 'archived' ? (
            <Button
              variant="outline"
              size="sm"
              disabled={dishStatus.isPending}
              onClick={() => void dishStatus.restore(dish)}
            >
              <RotateCcw aria-hidden="true" />
              {t('admin.menu.restore')}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => dishStatus.askArchive(dish)}>
              <Archive aria-hidden="true" />
              {t('admin.menu.archive.action')}
            </Button>
          )}
        </div>
        {/* key: al archivar/restaurar (o cambiar Visible/Oculto el personal) el formulario se reinicia. */}
        <DishForm
          key={`${dish.id}-${dish.status}`}
          dish={dish}
          categories={categories.data}
          readOnly={readOnly}
          onSaved={goBack}
          onCreatedWithoutImage={editCreated}
        />
        {dishStatus.dialog}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link
          to="/admin/menu/dishes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('admin.menu.dishes.backToList')}
        </Link>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
      </div>
      {body}
    </section>
  );
}
