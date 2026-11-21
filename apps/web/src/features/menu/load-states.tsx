import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Esqueleto de carga accesible (`aria-busy` + texto "cargando" para lectores de pantalla). */
export function LoadingBlock({ rows, className }: { rows: string[]; className?: string }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" className={cn('space-y-2', className)}>
      {rows.map((size, index) => (
        <Skeleton key={index} className={cn('w-full', size)} />
      ))}
      <span className="sr-only">{t('admin.loading')}</span>
    </div>
  );
}

/** Error de carga con botón de reintento. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <p role="alert" className="text-destructive">
        {t('admin.menu.errors.loadFailed')}
      </p>
      <Button variant="outline" onClick={onRetry}>
        {t('admin.retry')}
      </Button>
    </div>
  );
}
