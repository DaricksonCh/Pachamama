import { publicPath, type PublicMenu } from '@pachamama/shared';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { formatPrice } from '@/features/menu/price-format';
import { usePublicMenu } from '@/features/menu/public-api';
import { Photo, type PhotoKey } from '../photo';
import { useLang } from '../use-lang';
import { useReveal } from '../use-reveal';

/**
 * The three house classics (ADR 0015): diamonds cut like the manta's on the dark table, the middle
 * one set lower. Prices come from the live menu, matched by the German dish name (ignoring case);
 * if a dish is renamed or hidden in /admin, its card simply shows no price.
 * The photos are provisional stock photos until the professional ones arrive (docs/pendientes.md).
 */
const FEATURED = [
  { key: 'ceviche', menuName: 'Ceviche Clásico', photo: 'stockCeviche', crop: 'object-[50%_55%]' },
  { key: 'lomo', menuName: 'Lomo Saltado de Carne o Pollo', photo: 'stockLomo', crop: '' },
  { key: 'causa', menuName: 'Causa Limeña', photo: 'stockCausa', crop: '' },
] as const satisfies readonly { key: string; menuName: string; photo: PhotoKey; crop: string }[];

const sameName = (a: string, b: string) =>
  a.localeCompare(b, 'de', { sensitivity: 'accent' }) === 0;

function findPrice(menu: PublicMenu | undefined, nameDe: string) {
  for (const category of menu?.categories ?? []) {
    const dish = category.dishes.find((d) => sameName(d.nameDe, nameDe));
    if (dish) return dish.price;
  }
  return undefined;
}

function DishCard({
  dish,
  price,
  index,
}: {
  dish: (typeof FEATURED)[number];
  price: number | undefined;
  index: number;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const ref = useReveal<HTMLLIElement>();

  return (
    // The whole card opens the menu (stretched link from the heading), so the pointer and the
    // lift on hover/focus point at a real action.
    <li
      ref={ref}
      data-testid={`kitchen-dish-${dish.key}`}
      style={{ '--reveal-delay': `${index * 150}ms` } as CSSProperties}
      className="group relative text-center has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-8 has-[a:focus-visible]:outline-maiz md:even:mt-16"
    >
      <article>
        <div
          className={
            'relative mx-auto aspect-square w-[min(16rem,72vw)] motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-focus-within:-translate-y-1.5 motion-safe:group-hover:-translate-y-1.5 ' +
            "before:absolute before:-inset-[9px] before:bg-maiz before:content-[''] before:diamond"
          }
        >
          <div className="relative h-full w-full overflow-hidden diamond">
            <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-focus-within:scale-[1.06] motion-safe:group-hover:scale-[1.06]">
              <Photo photo={dish.photo} alt="" sizes="16rem" className={dish.crop} />
            </div>
          </div>
        </div>
        <h3 className="mt-5 font-display text-2xl font-medium md:text-[1.75rem]">
          <Link
            to={publicPath('menu', lang)}
            className="decoration-maiz decoration-2 underline-offset-[6px] group-hover:underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {t(`home.kitchen.dishes.${dish.key}.name`)}
          </Link>
        </h3>
        {price !== undefined && (
          <p className="mt-1 font-semibold text-maiz tabular-nums">{formatPrice(lang, price)}</p>
        )}
        <p className="mx-auto mt-2 max-w-[30ch] leading-relaxed text-papel/75">
          {t(`home.kitchen.dishes.${dish.key}.text`)}
        </p>
      </article>
    </li>
  );
}

export function HomeKitchen() {
  const { t } = useTranslation();
  const lang = useLang();
  const { data: menu } = usePublicMenu();
  const introRef = useReveal<HTMLDivElement>();

  return (
    <section
      aria-labelledby="kitchen-title"
      className="zigzag-seams bg-selva-deep py-20 text-papel [--seam:var(--secondary)] md:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div ref={introRef} className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="max-w-xl space-y-3">
            <h2
              id="kitchen-title"
              className="font-display text-4xl font-medium tracking-tight [font-variation-settings:'opsz'_144] md:text-5xl"
            >
              {t('home.kitchen.title')}
            </h2>
            <p className="text-lg leading-relaxed text-papel/80">{t('home.kitchen.lead')}</p>
          </div>
          <Link
            to={publicPath('menu', lang)}
            className="font-semibold underline decoration-maiz decoration-2 underline-offset-[6px] hover:decoration-papel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-maiz"
          >
            {t('home.kitchen.link')}
          </Link>
        </div>

        <ul className="mt-12 grid gap-14 md:grid-cols-3 md:gap-8">
          {FEATURED.map((dish, i) => (
            <DishCard key={dish.key} dish={dish} index={i} price={findPrice(menu, dish.menuName)} />
          ))}
        </ul>
      </div>
    </section>
  );
}
