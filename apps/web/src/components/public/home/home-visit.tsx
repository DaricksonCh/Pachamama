import { RESTAURANT_INFO, publicPath } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Photo } from '../photo';
import { ProvisionalMark } from '../provisional-mark';
import { ReserveButton } from '../reserve-button';
import { textLinkClass } from '../styles';
import { useLang } from '../use-lang';
import { useReveal } from '../use-reveal';
import { HomeHours } from './home-hours';

/** Home block 4 (ADR 0015): the dining room, where we are, today's hours and the reserve action. */
export function HomeVisit() {
  const { t } = useTranslation();
  const lang = useLang();
  const { address, phone } = RESTAURANT_INFO;
  const photoRef = useReveal<HTMLDivElement>();
  const textRef = useReveal<HTMLDivElement>();

  return (
    <section aria-labelledby="visit-title" className="bg-secondary">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:gap-16 md:py-28">
        <div ref={photoRef}>
          <Photo
            photo="localInterior"
            alt={t('home.photos.localInterior')}
            sizes="(min-width: 768px) 55vw, 100vw"
            className="aspect-[16/11] rounded-md"
          />
        </div>
        <div ref={textRef} className="[--reveal-delay:120ms]">
          <p aria-hidden="true" className="font-script text-3xl text-aji-deep">
            {t('home.visit.script')}
          </p>
          <h2
            id="visit-title"
            className="mt-1 font-display text-4xl font-medium tracking-tight text-selva md:text-5xl"
          >
            {t('home.visit.title')}
          </h2>
          <p className="mt-2 mb-6 font-script text-3xl text-chicha">{t('home.visit.slow')}</p>
          <dl className="mb-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
            <dt className="font-semibold">{t('home.visit.address')}</dt>
            <dd>
              {address.street}, {address.postalCode} {address.city}
            </dd>
            <dt className="font-semibold">{t('home.visit.hours')}</dt>
            <dd>
              <HomeHours />
            </dd>
            <dt className="font-semibold">{t('home.visit.phone')}</dt>
            <dd>
              <a href={`tel:${phone.e164}`} className={textLinkClass}>
                {phone.display}
              </a>
              <ProvisionalMark />
            </dd>
          </dl>
          <div className="flex flex-wrap items-center gap-6">
            <ReserveButton tone="onLight" />
            <Link to={publicPath('contact', lang)} className={textLinkClass}>
              {t('home.visit.link')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
