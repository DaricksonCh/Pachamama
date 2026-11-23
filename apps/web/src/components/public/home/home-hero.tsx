import { publicPath } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Photo } from '../photo';
import { ReserveButton } from '../reserve-button';
import { useLang } from '../use-lang';

/**
 * Home block 1 (ADR 0015): the restaurant's name set huge, "Pacha" and "mama" with their meaning
 * written by hand, next to Andean produce in an arch. The name is decoration (aria-hidden): the
 * real heading is the h1 below it.
 */
export function HomeHero() {
  const { t } = useTranslation();
  const lang = useLang();
  const meaning =
    'inline-block -translate-y-[0.4em] -rotate-6 font-script text-[0.22em] tracking-normal text-aji-deep';

  return (
    <section aria-labelledby="hero-title" className="overflow-hidden py-12 md:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 md:grid-cols-[1.25fr_0.75fr] md:gap-12">
        <div>
          <p
            aria-hidden="true"
            data-testid="home-name"
            className="mb-7 font-display text-[clamp(4.5rem,2rem+11vw,10.5rem)] leading-[0.82] font-medium tracking-[-0.035em] [font-variation-settings:'opsz'_144]"
          >
            <span className="flex items-baseline gap-2.5 text-selva motion-safe:animate-hero-in">
              <span lang="qu">{t('story.name.pacha')}</span>
              <span className={meaning}>{t('story.name.pachaMeaning')}</span>
            </span>
            <span className="flex items-baseline gap-2.5 pl-[0.6em] text-chicha italic motion-safe:animate-hero-in motion-safe:[animation-delay:160ms]">
              <span lang="qu">{t('story.name.mama').toLowerCase()}</span>
              <span className={meaning}>{t('story.name.mamaMeaning')}</span>
            </span>
          </p>
          <h1
            id="hero-title"
            className="max-w-[20ch] font-display text-3xl font-medium tracking-tight md:text-4xl"
          >
            {t('home.title')}
          </h1>
          <p className="mt-4 mb-7 max-w-md text-lg leading-relaxed">{t('home.lead')}</p>
          <div className="flex flex-wrap items-center gap-4">
            <ReserveButton tone="onLight" />
            <Link
              to={publicPath('menu', lang)}
              className="inline-flex min-h-11 items-center rounded-md border border-selva px-5 py-2.5 font-semibold text-selva hover:bg-selva/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selva"
            >
              {t('home.seeMenu')}
            </Link>
          </div>
        </div>

        <figure className="relative isolate mx-auto w-full max-w-sm md:max-w-none">
          <div
            aria-hidden="true"
            className="absolute -top-3.5 -right-3.5 -z-10 aspect-square w-3/5 rounded-full bg-maiz"
          />
          <Photo
            photo="stockMercadoAndino"
            alt={t('home.photos.mercado')}
            sizes="(min-width: 768px) 30vw, 90vw"
            priority
            className="aspect-[4/5] rounded-t-full rounded-b-md"
          />
          <figcaption className="mt-2 text-right font-script text-2xl text-selva">
            {t('home.hero.caption')}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
