import { publicPath } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ReserveButton } from '../reserve-button';
import { textLinkClass } from '../styles';
import { useLang } from '../use-lang';
import { useReveal } from '../use-reveal';

const LINES = [0, 1, 2] as const;

/** Story block: short centred lines, a handwritten sign-off and the visit calls to action. */
export function StoryManifesto() {
  const { t } = useTranslation();
  const lang = useLang();
  const ref = useReveal<HTMLDivElement>();

  return (
    <section
      aria-labelledby="story-visit-title"
      className="bg-secondary px-4 py-16 sm:px-6 md:py-24"
    >
      <div ref={ref} className="mx-auto max-w-2xl space-y-8 text-center">
        <h2
          id="story-visit-title"
          className="font-display text-4xl font-medium tracking-tight text-selva md:text-5xl"
        >
          {t('story.manifesto.title')}
        </h2>
        <ul className="space-y-2 font-display text-xl md:text-2xl">
          {LINES.map((i) => (
            <li key={i}>{t(`story.manifesto.lines.${i}`)}</li>
          ))}
        </ul>
        <p className="font-script text-4xl text-aji">{t('story.manifesto.signoff')}</p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <ReserveButton />
          <Link to={publicPath('menu', lang)} className={textLinkClass}>
            {t('story.seeMenu')}
          </Link>
        </div>
      </div>
    </section>
  );
}
