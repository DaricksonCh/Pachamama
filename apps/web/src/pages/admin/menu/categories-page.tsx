import type { AdminCategory, MenuStatus } from '@pachamama/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { useCategories, useReorder, useSaveCategory } from '@/features/menu/api';
import { ArchiveDialog } from '@/features/menu/archive-dialog';
import { ReorderButtons } from '@/features/menu/reorder-buttons';
import { StatusBadge } from '@/features/menu/status-badge';
import { ApiError } from '@/lib/api';

type Filter = 'active' | 'archived';

export function CategoriesPage() {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === 'admin';
  const [filter, setFilter] = useState<Filter>('active');
  const status: MenuStatus | undefined = filter === 'archived' ? 'archived' : undefined;
  const { data, isPending, isError, refetch } = useCategories(status);
  const reorder = useReorder('categories');
  const save = useSaveCategory();
  const [toArchive, setToArchive] = useState<AdminCategory | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const nameOf = (c: AdminCategory) => (i18n.language === 'es' ? c.nameEs : c.nameDe);

  const move = async (index: number, direction: 'up' | 'down') => {
    if (!data) return;
    const ids = data.map((c) => c.id);
    const target = direction === 'up' ? index - 1 : index + 1;
    const moved = ids[index];
    const other = ids[target];
    if (moved === undefined || other === undefined) return;
    ids[index] = other;
    ids[target] = moved;
    try {
      await reorder.mutateAsync(ids);
    } catch {
      toast.error(t('admin.menu.errors.reorderFailed'));
    }
  };

  const confirmArchive = async () => {
    if (!toArchive) return;
    setArchiveError(null);
    try {
      await save.mutateAsync({ id: toArchive.id, data: { status: 'archived' } });
      toast.success(t('admin.menu.categories.archived'));
      setToArchive(null);
    } catch (err) {
      setArchiveError(
        err instanceof ApiError && err.code === 'CATEGORY_HAS_DISHES'
          ? 'admin.menu.categories.errors.hasDishes'
          : 'admin.menu.errors.saveFailed',
      );
    }
  };

  const restore = async (category: AdminCategory) => {
    try {
      await save.mutateAsync({ id: category.id, data: { status: 'hidden' } });
      toast.success(t('admin.menu.categories.restored'));
    } catch {
      toast.error(t('admin.menu.errors.saveFailed'));
    }
  };

  let content;
  if (isPending) {
    content = (
      <div role="status" aria-busy="true" className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <span className="sr-only">{t('admin.loading')}</span>
      </div>
    );
  } else if (isError) {
    content = (
      <div className="space-y-3">
        <p role="alert" className="text-destructive">
          {t('admin.menu.errors.loadFailed')}
        </p>
        <Button variant="outline" onClick={() => void refetch()}>
          {t('admin.retry')}
        </Button>
      </div>
    );
  } else if (data.length === 0) {
    content = (
      <p className="text-muted-foreground">
        {t(
          filter === 'archived'
            ? 'admin.menu.categories.emptyArchived'
            : 'admin.menu.categories.empty',
        )}
      </p>
    );
  } else {
    content = (
      <Table>
        <caption className="sr-only">{t('admin.menu.categories.title')}</caption>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.menu.categories.columns.name')}</TableHead>
            <TableHead>{t('admin.menu.categories.columns.status')}</TableHead>
            <TableHead className="text-end">{t('admin.menu.categories.columns.dishes')}</TableHead>
            <TableHead>{t('admin.menu.categories.columns.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((category, index) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{nameOf(category)}</TableCell>
              <TableCell>
                <StatusBadge status={category.status} />
              </TableCell>
              <TableCell className="text-end">{category.dishCount}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to={`/admin/menu/categories/${category.id}`}
                      aria-label={t(isAdmin ? 'admin.menu.editNamed' : 'admin.menu.viewNamed', {
                        name: nameOf(category),
                      })}
                    >
                      {t(isAdmin ? 'admin.menu.edit' : 'admin.menu.view')}
                    </Link>
                  </Button>
                  {isAdmin && filter === 'active' ? (
                    <>
                      <ReorderButtons
                        index={index}
                        total={data.length}
                        name={nameOf(category)}
                        disabled={reorder.isPending}
                        onMove={(direction) => void move(index, direction)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={t('admin.menu.archive.actionNamed', { name: nameOf(category) })}
                        onClick={() => {
                          setArchiveError(null);
                          setToArchive(category);
                        }}
                      >
                        {t('admin.menu.archive.action')}
                      </Button>
                    </>
                  ) : null}
                  {isAdmin && filter === 'archived' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={save.isPending}
                      aria-label={t('admin.menu.restoreNamed', { name: nameOf(category) })}
                      onClick={() => void restore(category)}
                    >
                      {t('admin.menu.restore')}
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">{t('admin.menu.categories.title')}</h1>
        {isAdmin ? (
          <Button asChild>
            <Link to="/admin/menu/categories/new">{t('admin.menu.categories.new')}</Link>
          </Button>
        ) : null}
      </div>

      <div role="group" aria-label={t('admin.menu.filter.label')} className="flex gap-2">
        {(['active', 'archived'] as const).map((value) => (
          <Button
            key={value}
            variant={filter === value ? 'default' : 'outline'}
            size="sm"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {t(`admin.menu.filter.${value}`)}
          </Button>
        ))}
      </div>

      {content}

      <ArchiveDialog
        open={toArchive !== null}
        kind="category"
        name={toArchive ? nameOf(toArchive) : ''}
        error={archiveError}
        pending={save.isPending}
        onConfirm={() => void confirmArchive()}
        onOpenChange={(open) => {
          if (!open) setToArchive(null);
        }}
      />
    </section>
  );
}
