import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Photo, type PhotoKey } from '../photo';

const SLIDES: { photo: PhotoKey; alt: string }[] = [
  { photo: 'localVertical', alt: 'vertical' },
  // Dish photos: provisional stock photos until the professional ones arrive (docs/pendientes.md).
  { photo: 'stockEmpanadas', alt: 'empanadas' },
  { photo: 'stockCausaLangostinos', alt: 'causa' },
  { photo: 'stockJalea', alt: 'mariscos' },
  { photo: 'stockQuinua', alt: 'quinua' },
  { photo: 'stockHuancaina', alt: 'huancaina' },
  { photo: 'stockMaizMorado', alt: 'maizMorado' },
  { photo: 'stockMercadoAndino', alt: 'mercado' },
];

const arrowClass =
  'inline-flex size-11 items-center justify-center rounded-full border border-papel/40 text-papel transition-colors hover:bg-papel hover:text-tierra focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maiz';

/**
 * Story block: photo carousel before the footer. It never moves on its own (WCAG 2.2.2):
 * arrows, dots, swipe (scroll snap) and the keyboard on the focusable track.
 */
export function StoryGallery() {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);
  /** True while an arrow/dot scroll runs, so its intermediate scroll events do not move the dots. */
  const scrollingTo = useRef(false);
  const fallbackTimer = useRef<number | undefined>(undefined);
  const target = useRef(0);
  const total = SLIDES.length;

  /** Ends an arrow/dot scroll: dots follow swipes again and scroll snapping comes back. */
  function endProgrammaticScroll() {
    window.clearTimeout(fallbackTimer.current);
    scrollingTo.current = false;
    if (trackRef.current) trackRef.current.style.scrollSnapType = '';
  }

  /** A scroll interrupted by a newer arrow/dot click also fires scrollend: wait for the last one. */
  function onScrollEnd() {
    const track = trackRef.current;
    if (scrollingTo.current && track && Math.abs(track.scrollLeft - target.current) > 2) return;
    endProgrammaticScroll();
  }

  function goTo(index: number) {
    const next = (index + total) % total;
    // Commit the dots first: a re-render during a smooth scroll makes the browser re-snap and cancel it.
    flushSync(() => setCurrent(next));
    const track = trackRef.current;
    const slide = track?.children[next] as HTMLElement | undefined;
    if (track && slide && typeof track.scrollTo === 'function') {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const padding = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      const max = track.scrollWidth - track.clientWidth;
      const left = Math.min(slide.offsetLeft - padding, max);
      if (Math.abs(track.scrollLeft - left) > 1) {
        scrollingTo.current = true;
        target.current = left;
        // Snapping can stop a smooth scroll half way: pause it until the scroll ends.
        track.style.scrollSnapType = 'none';
        window.clearTimeout(fallbackTimer.current);
        // Fallback for browsers without the scrollend event.
        fallbackTimer.current = window.setTimeout(endProgrammaticScroll, 1500);
      }
      track.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  /** Swipe or keyboard scrolling: follow the slide that is closest to the start of the track. */
  function onScroll() {
    if (scrollingTo.current) return;
    const track = trackRef.current;
    const first = track?.children[0] as HTMLElement | undefined;
    if (!track || !first || first.offsetWidth === 0) return;
    const index = Math.min(
      Math.max(Math.round(track.scrollLeft / first.offsetWidth), 0),
      total - 1,
    );
    // At the end of the track the last slides cannot reach the start: keep a later choice.
    const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    setCurrent((prev) => (atEnd && prev > index ? prev : index));
  }

  return (
    <section
      aria-labelledby="story-gallery-title"
      aria-roledescription={t('story.gallery.roledescription')}
      className="bg-tierra py-14 md:py-20"
    >
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-6 px-4 pb-8 sm:px-6">
        <h2
          id="story-gallery-title"
          className="font-display text-4xl font-medium tracking-tight text-papel md:text-5xl"
        >
          {t('story.gallery.title')}
        </h2>
        <div className="flex gap-3">
          <button
            type="button"
            className={arrowClass}
            aria-label={t('story.gallery.prev')}
            onClick={() => goTo(current - 1)}
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            className={arrowClass}
            aria-label={t('story.gallery.next')}
            onClick={() => goTo(current + 1)}
          >
            <ArrowRight aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>

      <ul
        ref={trackRef}
        onScroll={onScroll}
        onScrollEnd={onScrollEnd}
        tabIndex={0}
        aria-label={t('story.gallery.title')}
        className="relative flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-2 overflow-x-auto px-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-maiz sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((slide, i) => (
          <li
            key={slide.photo}
            aria-label={t('story.gallery.slide', { current: i + 1, total })}
            className="aspect-[4/5] w-[80%] flex-none snap-start overflow-hidden sm:w-[46%] lg:w-[31%]"
          >
            <Photo
              photo={slide.photo}
              alt={t(`story.photos.${slide.alt}`)}
              sizes="(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 80vw"
              className="transition-transform duration-700 motion-safe:hover:scale-105"
            />
          </li>
        ))}
      </ul>

      <div className="mx-auto flex max-w-6xl gap-2 px-4 pt-6 sm:px-6">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.photo}
            type="button"
            aria-label={t('story.gallery.goTo', { n: i + 1 })}
            aria-current={i === current ? 'true' : undefined}
            onClick={() => goTo(i)}
            className="flex h-11 min-w-6 items-center justify-center focus-visible:outline-2 focus-visible:outline-maiz"
          >
            <span
              aria-hidden="true"
              className={cn(
                'block h-1.5 rounded-full transition-all',
                i === current ? 'w-8 bg-maiz' : 'w-3 bg-papel/40',
              )}
            />
          </button>
        ))}
      </div>
      <p aria-live="polite" className="sr-only">
        {t('story.gallery.slide', { current: current + 1, total })}
      </p>
    </section>
  );
}
