import { publicPath } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { Photo, type PhotoKey } from '../photo';
import { useLang } from '../use-lang';
import { useReveal } from '../use-reveal';

/** A photo taped to the wall: white border, handwritten caption and a strip of maíz tape. */
function PinnedPhoto({
  photo,
  alt,
  caption,
  className,
  imageClassName,
}: {
  photo: PhotoKey;
  alt: string;
  caption: string;
  className: string;
  imageClassName: string;
}) {
  return (
    <figure
      className={cn(
        'absolute m-0 bg-white px-2.5 pt-2.5 shadow-[0_18px_36px_-18px_rgba(31,42,29,0.55)] hover:z-10 hover:rotate-0 motion-safe:transition-transform motion-safe:duration-500 motion-safe:hover:scale-[1.03]',
        "before:absolute before:-top-2.5 before:left-1/2 before:h-5 before:w-18 before:-translate-x-1/2 before:-rotate-3 before:bg-maiz/75 before:content-['']",
        className,
      )}
    >
      <Photo
        photo={photo}
        alt={alt}
        sizes="(min-width: 768px) 25vw, 55vw"
        className={imageClassName}
      />
      <figcaption className="py-1.5 text-center font-script text-xl">{caption}</figcaption>
    </figure>
  );
}

/**
 * Home block 2 (ADR 0015): the way into the story page. Placeholder copy until the real story
 * arrives (docs/pendientes.md); the photos and the link are real.
 */
export function HomeStory() {
  const { t } = useTranslation();
  const lang = useLang();
  const textRef = useReveal<HTMLDivElement>();
  const photosRef = useReveal<HTMLDivElement>();

  return (
    <section aria-labelledby="story-title" className="overflow-hidden bg-secondary py-16 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 md:grid-cols-2 md:gap-16">
        <div ref={textRef}>
          <p aria-hidden="true" className="font-script text-3xl text-aji-deep">
            {t('home.story.script')}
          </p>
          <h2
            id="story-title"
            className="mt-1 font-display text-4xl font-medium tracking-tight text-selva md:text-5xl"
          >
            {t('home.story.title')}
          </h2>
          <p className="mt-5 mb-7 max-w-prose text-lg leading-relaxed">{t('home.story.text')}</p>
          <Link
            to={publicPath('story', lang)}
            className="inline-flex min-h-11 items-center rounded-md bg-selva px-5 py-2.5 font-semibold text-papel hover:bg-selva-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selva"
          >
            {t('home.story.link')}
          </Link>
        </div>

        <div ref={photosRef} className="relative h-[25rem] [--reveal-delay:150ms] md:h-[30rem]">
          <PinnedPhoto
            photo="cocinera"
            alt={t('home.photos.cocinera')}
            caption={t('home.story.captions.cocinera')}
            className="top-0 left-[4%] w-[56%] -rotate-4"
            imageClassName="aspect-[4/5]"
          />
          <PinnedPhoto
            photo="equipo"
            alt={t('home.photos.equipo')}
            caption={t('home.story.captions.equipo')}
            className="right-[2%] bottom-0 w-1/2 rotate-5"
            imageClassName="aspect-square"
          />
        </div>
      </div>
    </section>
  );
}
