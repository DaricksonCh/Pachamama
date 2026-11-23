import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useReveal } from '../use-reveal';

export type StoryChapter = 'origin' | 'family' | 'kitchen';

interface StorySplitProps {
  chapter: StoryChapter;
  /** bleed: photo fills its half · tilted: framed photo turned a few degrees · duo: two photos. */
  variant?: 'bleed' | 'tilted' | 'duo';
  /** Media on the left on wide screens (on phones it always goes above the text). */
  reverse?: boolean;
  tone?: 'paper' | 'sand';
  media: ReactNode;
  /** Extra content under the paragraphs (e.g. a signature). */
  children?: ReactNode;
  paragraphs: string[];
}

/** Story block: half text, half photo, each chapter with its own variant (ADR 0013). */
export function StorySplit({
  chapter,
  variant = 'bleed',
  reverse = false,
  tone = 'paper',
  media,
  children,
  paragraphs,
}: StorySplitProps) {
  const { t } = useTranslation();
  const textRef = useReveal<HTMLDivElement>();
  const titleId = `story-${chapter}-title`;

  return (
    <section
      aria-labelledby={titleId}
      className={cn('grid md:min-h-[34rem] md:grid-cols-2', tone === 'sand' && 'bg-secondary')}
    >
      <div
        ref={textRef}
        className="flex flex-col justify-center px-6 py-14 sm:px-10 md:py-20 lg:px-20"
      >
        <div className="max-w-xl space-y-5">
          <p className="text-sm font-semibold tracking-[0.18em] text-aji-deep uppercase">
            {t(`story.chapters.${chapter}.eyebrow`)}
          </p>
          <h2
            id={titleId}
            className="font-display text-4xl font-medium tracking-tight text-selva md:text-5xl"
          >
            {t(`story.chapters.${chapter}.title`)}
          </h2>
          {paragraphs.map((text, i) => (
            <p key={i} className="leading-relaxed">
              {text}
            </p>
          ))}
          {children}
        </div>
      </div>

      <div
        className={cn(
          'order-first',
          reverse ? 'md:order-first' : 'md:order-last',
          variant === 'tilted'
            ? 'flex items-center justify-center px-8 pt-12 md:p-14'
            : 'relative min-h-[20rem] sm:min-h-[26rem]',
        )}
      >
        {variant === 'tilted' ? (
          <div className="w-full max-w-md -rotate-3 border-8 border-papel shadow-xl motion-safe:transition-transform motion-safe:duration-700 motion-safe:hover:rotate-0">
            {media}
          </div>
        ) : (
          <div
            className={cn(
              'absolute inset-0',
              variant === 'duo' && 'grid grid-cols-[1.5fr_1fr] gap-1',
            )}
          >
            {media}
          </div>
        )}
      </div>
    </section>
  );
}
