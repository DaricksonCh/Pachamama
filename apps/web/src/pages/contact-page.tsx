import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/public/page-header';
import { usePageMeta } from '@/components/public/use-page-meta';

/** Skeleton page (M2.1): content is added in its own M2 task. */
export function ContactPage() {
  const { t } = useTranslation();
  usePageMeta(t('pages.contact.title'), t('pages.contact.description'));

  return <PageHeader title={t('pages.contact.title')} />;
}
