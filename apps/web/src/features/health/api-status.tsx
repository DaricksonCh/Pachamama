import { useTranslation } from 'react-i18next';
import { useHealth } from './use-health';

export function ApiStatus() {
  const { t } = useTranslation();
  const { isPending, isError } = useHealth();

  const state = isPending ? 'loading' : isError ? 'error' : 'ok';
  const dotColor = { loading: 'bg-gray-400', ok: 'bg-green-600', error: 'bg-red-600' }[state];

  return (
    <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
      <span className={`inline-block size-2.5 rounded-full ${dotColor}`} aria-hidden="true" />
      <span>
        {t('status.label')}: {t(`status.${state}`)}
      </span>
    </p>
  );
}
