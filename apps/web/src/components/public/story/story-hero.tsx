import { useTranslation } from 'react-i18next';
import { Photo } from '../photo';
import { WovenStripe } from '../woven-stripe';

/** Story block 1: full-bleed photo with an offset paper card that overlaps its lower edge. */
export function StoryHero() {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <div className="relative h-[52vh] max-h-[40rem] min-h-[20rem] overflow-hidden bg-tierra md:h-[68vh]">
        <Photo
          photo="localInterior"
          alt={t('story.photos.interior')}
          sizes="100vw"
          priority
          className="motion-safe:animate-slow-zoom"
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative z-10 -mt-20 overflow-hidden rounded-sm bg-papel shadow-xl motion-safe:animate-hero-in md:-mt-44 md:ml-[4%] md:w-[min(38rem,62%)]">
          <WovenStripe className="h-[10px]" />
          <div className="space-y-4 px-6 py-8 sm:px-10 sm:py-10">
            <p aria-hidden="true" className="-mb-1 font-script text-3xl text-aji sm:text-4xl">
              {t('story.script')}
            </p>
            <h1 className="font-display text-4xl font-medium tracking-tight break-words hyphens-auto text-selva sm:text-5xl md:text-6xl">
              {t('pages.story.title')}
            </h1>
            <p className="text-lg leading-relaxed">{t('story.lead')}</p>
            <p role="note" className="border-l-4 border-maiz pl-3 text-sm text-muted-foreground">
              {t('story.notice')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
