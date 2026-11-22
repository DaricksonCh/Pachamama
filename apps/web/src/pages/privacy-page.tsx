import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/public/page-header';
import { usePageMeta } from '@/components/public/use-page-meta';

/** Skeleton page (M2.1): content is added in its own M2 task. */
export function PrivacyPage() {
  const { t } = useTranslation();
  usePageMeta(t('pages.privacy.title'), t('pages.privacy.description'));

  return <PageHeader title={t('pages.privacy.title')} />;
}
