import { ALLERGENS, type Language, type PublicMenu } from '@pachamama/shared';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '@/features/menu/price-format';
import { cn } from '@/lib/utils';
import { useReveal } from '../use-reveal';
import { WovenStripe } from '../woven-stripe';
import { type BandTone, bandTone, categoryAnchor, isCompactCategory } from './menu-bands';

type Category = PublicMenu['categories'][number];
type Dish = Category['dishes'][number];

const pickText = (lang: Language, de: string, es: string) => (lang === 'de' ? de : es);

function DishRow({ dish, lang, compact }: { dish: Dish; lang: Language; compact: boolean }) {
  const { t } = useTranslation();
  const ref = useReveal<HTMLLIElement>();
  const description = pickText(lang, dish.descriptionDe ?? '', dish.descriptionEs ?? '');
  const { image } = dish;

  return (
    <li
      ref={ref}
      className={cn(
        'group grid grid-cols-[auto_1fr_auto] gap-x-3 border-b border-tierra/12',
        compact ? 'py-3' : 'py-4',
      )}
    >
      {/* Diamond of the band's colour, like the manta's; it turns when the row is pointed at. */}
      <span
        aria-hidden="true"
        className="mt-2 size-3 bg-(--band) diamond motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:rotate-90"
      />
      <h3 className="font-display text-xl text-selva">
        {pickText(lang, dish.nameDe, dish.nameEs)}
      </h3>
      <p className="font-semibold whitespace-nowrap tabular-nums">
        {formatPrice(lang, dish.price)}
      </p>
      <div className="col-span-2 col-start-2">
        {description ? (
          <p className={cn('max-w-prose text-muted-foreground', compact && 'text-sm')}>
            {description}
          </p>
        ) : null}
        {dish.diet || dish.allergens.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            {dish.diet ? (
              <span className="rounded-full bg-secondary px-3 py-0.5 font-semibold text-selva">
                {t(`menu.diet.${dish.diet}`)}
              </span>
            ) : null}
            {dish.allergens.length > 0 ? (
              <ul aria-label={t('menu.allergens')} className="flex flex-wrap gap-1">
                {dish.allergens.map((code) => (
                  <li
                    key={code}
                    className="inline-flex size-6 items-center justify-center rounded-sm border border-tierra/40 text-xs font-semibold"
                  >
                    <span aria-hidden="true">{code}</span>
                    <span className="sr-only">{ALLERGENS[code][lang]}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {image ? (
          <img
            src={image.url.w800}
            srcSet={`${image.url.w400} 400w, ${image.url.w800} 800w`}
            sizes="(min-width: 640px) 22rem, 80vw"
            alt=""
            loading="lazy"
            decoding="async"
            className="mt-3 aspect-video w-full max-w-88 rounded-sm border-b-4 border-(--band) object-cover"
          />
        ) : null}
      </div>
    </li>
  );
}

function bandStyle(tone: BandTone) {
  return {
    '--band': tone.band,
    '--band-ink': tone.ink,
    '--band-accent': tone.accent,
  } as CSSProperties;
}

/** One category as a coloured band of the manta, with its dishes below (ADR 0016). */
export function MenuBand({
  category,
  index,
  lang,
}: {
  category: Category;
  index: number;
  lang: Language;
}) {
  const { t } = useTranslation();
  const anchor = categoryAnchor(category.id);
  const description = pickText(lang, category.descriptionDe ?? '', category.descriptionEs ?? '');
  const compact = isCompactCategory(category);

  return (
    <section
      id={anchor}
      aria-labelledby={`${anchor}-title`}
      style={bandStyle(bandTone(index))}
      className="scroll-mt-28"
    >
      <WovenStripe className="h-2.5" />
      <div className="menu-band-head relative overflow-hidden bg-(--band) text-(--band-ink)">
        <div className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-6 gap-y-2 px-4 py-8 sm:px-6">
          <h2
            id={`${anchor}-title`}
            tabIndex={-1}
            className="font-display text-4xl font-medium tracking-tight break-words hyphens-auto focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current sm:text-5xl"
          >
            {pickText(lang, category.nameDe, category.nameEs)}
          </h2>
          <p className="text-sm opacity-90 sm:ml-auto">
            {t('menu.dishCount', { count: category.dishes.length })}
          </p>
          {description ? <p className="max-w-prose basis-full text-lg">{description}</p> : null}
        </div>
      </div>
      <ul
        className={cn(
          'mx-auto grid max-w-6xl px-4 pt-4 pb-14 sm:px-6',
          compact ? 'gap-x-8 sm:grid-cols-2 lg:grid-cols-3' : 'gap-x-14 lg:grid-cols-2',
        )}
      >
        {category.dishes.map((dish) => (
          <DishRow key={dish.id} dish={dish} lang={lang} compact={compact} />
        ))}
      </ul>
    </section>
  );
}
