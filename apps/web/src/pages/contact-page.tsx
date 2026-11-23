import { useTranslation } from 'react-i18next';
import { ContactFarewell } from '@/components/public/contact/contact-farewell';
import { ContactHours } from '@/components/public/contact/contact-hours';
import { ContactMap } from '@/components/public/contact/contact-map';
import { ContactPostcard } from '@/components/public/contact/contact-postcard';
import { usePageMeta } from '@/components/public/use-page-meta';

/** Contact page in blocks (ADR 0013, ADR 0014): postcard, quipu hours, taped map, goodbye. */
export function ContactPage() {
  const { t } = useTranslation();
  usePageMeta(t('pages.contact.title'), t('pages.contact.description'));

  return (
    <>
      <ContactPostcard />
      <ContactHours />
      <ContactMap />
      <ContactFarewell />
    </>
  );
}
