import { ArrowLeft } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { useCategory } from '@/features/menu/api';
import { CategoryForm } from '@/features/menu/category-form';
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

  let title = t('admin.menu.categories.new');
  if (!isNew) {
    title = category
      ? i18n.language === 'es'
        ? category.nameEs
        : category.nameDe
      : t('admin.menu.categories.edit');
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
    body = <CategoryForm category={category} readOnly={readOnly} onSaved={goBack} />;
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
