import { RESTAURANT_INFO } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/public/page-header';
import { ProvisionalMark } from '@/components/public/provisional-mark';
import { ReserveButton } from '@/components/public/reserve-button';
import { textLinkClass } from '@/components/public/styles';
import { useLang } from '@/components/public/use-lang';
import { usePageMeta } from '@/components/public/use-page-meta';

const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=Am+Gaswerk+1,+28197+Bremen';
const OSM_URL =
  'https://www.openstreetmap.org/?mlat=53.0753555&mlon=8.7835367#map=17/53.0753555/8.7835367';
const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

export function ContactPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const { address, openingHours, phone, email } = RESTAURANT_INFO;
  usePageMeta(t('pages.contact.title'), t('pages.contact.description'));

  return (
    <>
      <PageHeader title={t('pages.contact.title')} lead={t('contact.lead')} />

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-20">
        <div className="space-y-10">
          <dl className="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-x-8">
            <dt className="font-semibold">{t('contact.address')}</dt>
            <dd>
              <address className="not-italic">
                {address.street}
                <br />
                {address.postalCode} {address.city}
              </address>
            </dd>
            <dt className="font-semibold">{t('contact.hours')}</dt>
            <dd>{openingHours[lang]}</dd>
            <dt className="font-semibold">{t('contact.phone')}</dt>
            <dd>
              <a href={`tel:${phone.e164}`} className={textLinkClass}>
                {phone.display}
              </a>
              <ProvisionalMark />
            </dd>
            <dt className="font-semibold">{t('contact.email')}</dt>
            <dd>
              <a href={`mailto:${email}`} className={textLinkClass}>
                {email}
              </a>
              <ProvisionalMark />
            </dd>
          </dl>

          <section aria-labelledby="how-title" className="space-y-2">
            <h2
              id="how-title"
              className="font-display text-3xl font-medium tracking-tight text-selva"
            >
              {t('contact.howTitle')}
            </h2>
            <p className="leading-relaxed">{t('contact.howText')}</p>
          </section>

          <ReserveButton />
        </div>

        <figure className="space-y-3">
          <img
            src="/images/map/kontakt-karte.webp"
            alt={t('contact.mapAlt')}
            width={512}
            height={384}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full rounded-md"
          />
          <figcaption className="text-sm text-muted-foreground">
            <a
              href={OSM_COPYRIGHT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {t('contact.mapAttribution')}
              <span className="sr-only"> {t('contact.newTab')}</span>
            </a>{' '}
            {t('contact.mapLicense')}
            <span className="block">{t('contact.mapNote')}</span>
          </figcaption>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={textLinkClass}
              >
                {t('contact.openGoogle')}
                <span className="sr-only"> {t('contact.newTab')}</span>
              </a>
            </li>
            <li>
              <a href={OSM_URL} target="_blank" rel="noopener noreferrer" className={textLinkClass}>
                {t('contact.openOsm')}
                <span className="sr-only"> {t('contact.newTab')}</span>
              </a>
            </li>
          </ul>
        </figure>
      </div>
    </>
  );
}
