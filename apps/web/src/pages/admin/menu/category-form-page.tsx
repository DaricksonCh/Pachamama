import { Archive, ArrowLeft, RotateCcw } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { useCategory } from '@/features/menu/api';
import { CategoryForm } from '@/features/menu/category-form';
import { StatusBadge } from '@/features/menu/status-badge';
import { useCategoryStatus } from '@/features/menu/use-category-status';
import type { AdminCategory } from '@pachamama/shared';
import { ApiError } from '@/lib/api';

export function CategoryFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const { data: user } = useCurrentUser();
  const isNew = params.id === undefined;
  const id = isNew ? undefined : Number(params.id);
  const validId = id !== undefined && Number.isInteger(id) && id > 0;
  const { data: category, isPending, error, refetch } = useCategory(validId ? id : undefined);

  const readOnly = user?.role !== 'admin';
  const goBack = useCallback(() => void navigate('/admin/menu/categories'), [navigate]);
  const nameOf = (c: AdminCategory) => (i18n.language === 'es' ? c.nameEs : c.nameDe);
  const categoryStatus = useCategoryStatus(nameOf, goBack);

  let title = t('admin.menu.categories.new');
  if (!isNew) {
    title = category ? nameOf(category) : t('admin.menu.categories.edit');
  }

  let body;
  if (isNew) {
    body = readOnly ? (
      <p role="alert">{t('admin.menu.errors.forbidden')}</p>
    ) : (
      <CategoryForm onSaved={goBack} />
    );
  } else if (!validId || (error instanceof ApiError && error.status === 404)) {
    body = <p role="alert">{t('admin.menu.categories.notFound')}</p>;
  } else if (isPending) {
    body = (
      <div role="status" aria-busy="true" className="max-w-2xl space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <span className="sr-only">{t('admin.loading')}</span>
      </div>
    );
  } else if (error) {
    body = (
      <div className="space-y-3">
        <p role="alert" className="text-destructive">
          {t('admin.menu.errors.loadFailed')}
        </p>
        <Button variant="outline" onClick={() => void refetch()}>
          {t('admin.retry')}
        </Button>
      </div>
    );
  } else {
    body = (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={category.status} />
          {category.status === 'archived' ? (
            <p className="text-sm text-muted-foreground">
              {t('admin.menu.categories.archivedNotice')}
            </p>
          ) : null}
          {readOnly ? null : category.status === 'archived' ? (
            <Button
              variant="outline"
              size="sm"
              disabled={categoryStatus.isPending}
              onClick={() => void categoryStatus.restore(category)}
            >
              <RotateCcw aria-hidden="true" />
              {t('admin.menu.restore')}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => categoryStatus.askArchive(category)}>
              <Archive aria-hidden="true" />
              {t('admin.menu.archive.action')}
            </Button>
          )}
        </div>
        {/* key: al archivar/restaurar el formulario se reinicia con el estado nuevo. */}
        <CategoryForm
          key={category.status}
          category={category}
          readOnly={readOnly}
          onSaved={goBack}
        />
        {categoryStatus.dialog}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link
          to="/admin/menu/categories"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('admin.menu.categories.backToList')}
        </Link>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
      </div>
      {body}
    </section>
  );
}
