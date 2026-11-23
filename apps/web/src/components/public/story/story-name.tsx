import { useTranslation } from 'react-i18next';
import { useReveal } from '../use-reveal';
import { WovenStripe } from '../woven-stripe';

/** Story block: full-width chicha band that explains the restaurant's name. */
export function StoryName() {
  const { t } = useTranslation();
  const ref = useReveal<HTMLDivElement>();

  return (
    <section aria-labelledby="story-name-title">
      <div className="bg-chicha px-4 py-16 text-center text-papel sm:px-6 md:py-24">
        <div ref={ref} className="mx-auto max-w-4xl space-y-5">
          <h2
            id="story-name-title"
            className="text-sm font-semibold tracking-[0.18em] text-maiz uppercase"
          >
            {t('story.name.title')}
          </h2>
          <p className="font-display text-3xl font-medium tracking-tight sm:text-4xl md:text-6xl">
            <span lang="qu" className="text-maiz">
              {t('story.name.pacha')}
            </span>{' '}
            = {t('story.name.pachaMeaning')}{' '}
            <span aria-hidden="true" className="mx-2 text-maiz/70">
              ·
            </span>{' '}
            <span lang="qu" className="text-maiz">
              {t('story.name.mama')}
            </span>{' '}
            = {t('story.name.mamaMeaning')}
          </p>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-papel/90">
            {t('story.name.support')}
          </p>
        </div>
      </div>
      <WovenStripe />
    </section>
  );
}
