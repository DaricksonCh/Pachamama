import { RESTAURANT_INFO, publicPath } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { KitchenSection } from '@/components/public/kitchen-section';
import { Photo } from '@/components/public/photo';
import { ProvisionalMark } from '@/components/public/provisional-mark';
import { ReserveButton } from '@/components/public/reserve-button';
import { textLinkClass } from '@/components/public/styles';
import { useLang } from '@/components/public/use-lang';
import { usePageMeta } from '@/components/public/use-page-meta';

export function HomePage() {
  const { t } = useTranslation();
  const lang = useLang();
  const { address, openingHours, phone } = RESTAURANT_INFO;
  usePageMeta(undefined, t('meta.homeDescription'));

  return (
    <>
      {/* Hero: a full table of dishes (provisional stock photo until the professional ones arrive). */}
      <section aria-labelledby="hero-title" className="bg-selva text-papel">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.15fr] md:py-20">
          <div className="space-y-7 motion-safe:animate-hero-in">
            <h1
              id="hero-title"
              className="font-display text-display font-medium tracking-tight [font-variation-settings:'opsz'_144]"
            >
              {t('home.title')}
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-papel/85">{t('home.lead')}</p>
            <div className="flex flex-wrap gap-4">
              <ReserveButton tone="onDark" />
              <Link
                to={publicPath('menu', lang)}
                className="inline-flex min-h-11 items-center rounded-md border border-papel/60 px-5 py-2.5 font-semibold hover:bg-papel/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-maiz"
              >
                {t('home.seeMenu')}
              </Link>
            </div>
          </div>
          <div className="-mx-4 overflow-hidden sm:mx-0 sm:rounded-lg">
            <Photo
              photo="stockFestin"
              alt={t('home.photos.mesaSurtida')}
              sizes="(min-width: 768px) 55vw, 100vw"
              priority
              className="aspect-[3/2]"
            />
          </div>
        </div>
      </section>

      {/* Story teaser */}
      <section
        aria-labelledby="story-title"
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24"
      >
        <div className="grid items-center gap-10 md:grid-cols-[1fr_1.3fr]">
          <Photo
            photo="cocinera"
            alt={t('home.photos.cocinera')}
            sizes="(min-width: 768px) 40vw, 100vw"
            className="aspect-[4/5] rounded-md md:max-w-sm"
          />
          <div className="max-w-prose space-y-5">
            <h2
              id="story-title"
              className="font-display text-4xl font-medium tracking-tight text-selva"
            >
              {t('home.story.title')}
            </h2>
            <p className="text-lg leading-relaxed">{t('home.story.text')}</p>
            <Link to={publicPath('story', lang)} className={textLinkClass}>
              {t('home.story.link')}
            </Link>
          </div>
        </div>
      </section>
      <KitchenSection />

      {/* Visit us: address, hours and the reserve action next to the dining room. */}
      <section aria-labelledby="visit-title" className="bg-secondary">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
          <Photo
            photo="localInterior"
            alt={t('home.photos.localInterior')}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="aspect-[16/10] rounded-md"
          />
          <div className="space-y-6">
            <h2
              id="visit-title"
              className="font-display text-4xl font-medium tracking-tight text-selva"
            >
              {t('home.visit.title')}
            </h2>
            <dl className="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-x-8">
              <dt className="font-semibold">{t('home.visit.address')}</dt>
              <dd>
                {address.street}, {address.postalCode} {address.city}
              </dd>
              <dt className="font-semibold">{t('home.visit.hours')}</dt>
              <dd>{openingHours[lang]}</dd>
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
    </>
  );
}
