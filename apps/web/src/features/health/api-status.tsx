import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { useHealth } from './use-health';

export function ApiStatus() {
  const { t } = useTranslation();
  const { isPending, isError } = useHealth();

  if (isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-600" role="status" aria-busy="true">
        <Skeleton className="size-2.5 rounded-full" />
        <Skeleton className="h-4 w-40" />
        <span className="sr-only">
          {t('status.label')}: {t('status.loading')}
        </span>
      </p>
    );
  }

  const state = isError ? 'error' : 'ok';
  const dotColor = { ok: 'bg-green-600', error: 'bg-red-600' }[state];

  return (
    <p className="flex items-center gap-2 text-sm text-gray-600" role="status" aria-busy="false">
      <span className={`inline-block size-2.5 rounded-full ${dotColor}`} aria-hidden="true" />
      <span>
        {t('status.label')}: {t(`status.${state}`)}
      </span>
    </p>
  );
}
