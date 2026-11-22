import { Archive, ArrowLeft, RotateCcw } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { useCategory } from '@/features/menu/api';
import { CategoryForm } from '@/features/menu/category-form';
import { LoadError, LoadingBlock } from '@/features/menu/load-states';
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
    body = <LoadingBlock rows={['h-9', 'h-9', 'h-20']} className="max-w-2xl space-y-4" />;
  } else if (error) {
    body = <LoadError onRetry={() => void refetch()} />;
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
