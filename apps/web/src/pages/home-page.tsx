import { RESTAURANT_INFO, publicPath, type Language } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Photo } from '@/components/public/photo';
import { ReserveButton } from '@/components/public/reserve-button';
import { usePageMeta } from '@/components/public/use-page-meta';

const textLink =
  'rounded-sm font-semibold text-selva underline decoration-maiz decoration-2 underline-offset-[6px] hover:decoration-selva focus-visible:outline-2 focus-visible:outline-offset-4';

export function HomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const { address, openingHours, phone } = RESTAURANT_INFO;
  usePageMeta(undefined, t('meta.homeDescription'));

  return (
    <>
      {/* Hero: the full table of dishes is the most characteristic image the restaurant has. */}
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
              photo="mesaSurtida"
              alt={t('home.photos.mesaSurtida')}
              sizes="(min-width: 768px) 55vw, 100vw"
              priority
              className="aspect-[3/2]"
            />
          </div>
        </div>
      </section>

      {/* From our kitchen: three dishes in an uneven, editorial arrangement. */}
      <section
        aria-labelledby="kitchen-title"
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24"
      >
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <h2
            id="kitchen-title"
            className="font-display text-4xl font-medium tracking-tight text-selva md:text-5xl"
          >
            {t('home.kitchen.title')}
          </h2>
          <Link to={publicPath('menu', lang)} className={textLink}>
            {t('home.kitchen.link')}
          </Link>
        </div>
        <ul className="grid gap-x-6 gap-y-10 md:grid-cols-12">
          <li className="md:col-span-7">
            <figure>
              <Photo
                photo="causa"
                alt=""
                sizes="(min-width: 768px) 55vw, 100vw"
                className="aspect-[16/10] rounded-md object-[50%_85%]"
              />
              <figcaption className="mt-3">
                <span className="font-display text-2xl text-selva">
                  {t('home.kitchen.causaName')}
                </span>
                <span className="block text-muted-foreground">{t('home.kitchen.causa')}</span>
              </figcaption>
            </figure>
          </li>
          <li className="md:col-span-5 md:mt-24">
            <figure>
              <Photo
                photo="quinua"
                alt=""
                sizes="(min-width: 768px) 40vw, 100vw"
                className="aspect-[4/5] rounded-md"
              />
              <figcaption className="mt-3">
                <span className="font-display text-2xl text-selva">
                  {t('home.kitchen.quinuaName')}
                </span>
                <span className="block text-muted-foreground">{t('home.kitchen.quinua')}</span>
              </figcaption>
            </figure>
          </li>
          <li className="md:col-span-6 md:col-start-3 md:-mt-10">
            <figure>
              <Photo
                photo="tamal"
                alt=""
                sizes="(min-width: 768px) 50vw, 100vw"
                className="aspect-[2/1] rounded-md object-[60%_85%]"
              />
              <figcaption className="mt-3">
                <span className="font-display text-2xl text-selva">
                  {t('home.kitchen.tamalName')}
                </span>
                <span className="block text-muted-foreground">{t('home.kitchen.tamal')}</span>
              </figcaption>
            </figure>
          </li>
        </ul>
      </section>

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
                <a href={`tel:${phone.e164}`} className={textLink}>
                  {phone.display}
                </a>
              </dd>
            </dl>
            <div className="flex flex-wrap items-center gap-6">
              <ReserveButton tone="onLight" />
              <Link to={publicPath('contact', lang)} className={textLink}>
                {t('home.visit.link')}
              </Link>
            </div>
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
            <Link to={publicPath('story', lang)} className={textLink}>
              {t('home.story.link')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
