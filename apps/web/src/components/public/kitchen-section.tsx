import { publicPath, type PublicMenu } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Photo } from '@/components/public/photo';
import { useLang } from '@/components/public/use-lang';
import { formatPrice } from '@/features/menu/price-format';
import { usePublicMenu } from '@/features/menu/public-api';

/**
 * The three house classics shown on the home page. Prices come from the live menu, matched by
 * the German dish name (ignoring case); if a dish is renamed or hidden in /admin, its card simply shows no price.
 * Ceviche and Lomo Saltado have no photo of their own yet: until the professional photos arrive
 * they use a close crop of the "mesa surtida" photo, where both dishes appear (docs/pendientes.md).
 */
const FEATURED = [
  {
    key: 'ceviche',
    menuName: 'Ceviche Clásico',
    photo: 'mesaSurtida',
    crop: 'origin-[47%_62%] scale-[2.2]',
  },
  {
    key: 'lomo',
    menuName: 'Lomo Saltado de Carne o Pollo',
    photo: 'mesaSurtida',
    crop: 'object-[100%_30%] origin-[60%_30%] scale-[2.2]',
  },
  { key: 'causa', menuName: 'Causa Limeña', photo: 'causa', crop: 'object-[50%_70%]' },
] as const;

const sameName = (a: string, b: string) =>
  a.localeCompare(b, 'de', { sensitivity: 'accent' }) === 0;

function findPrice(menu: PublicMenu | undefined, nameDe: string) {
  for (const category of menu?.categories ?? []) {
    const dish = category.dishes.find((d) => sameName(d.nameDe, nameDe));
    if (dish) return dish.price;
  }
  return undefined;
}

export function KitchenSection() {
  const { t } = useTranslation();
  const lang = useLang();
  const { data: menu } = usePublicMenu();

  return (
    <section aria-labelledby="kitchen-title" className="bg-selva-deep text-papel">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="max-w-xl space-y-4">
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

        <ul className="mt-10 grid gap-10 md:mt-12 md:grid-cols-3 md:gap-8">
          {FEATURED.map(({ key, menuName, photo, crop }) => {
            const price = findPrice(menu, menuName);
            return (
              <li key={key} data-testid={`kitchen-dish-${key}`}>
                <article>
                  <div className="aspect-[3/2] overflow-hidden rounded-md bg-tierra md:aspect-[4/5]">
                    <Photo
                      photo={photo}
                      alt=""
                      sizes="(min-width: 768px) 30vw, 100vw"
                      className={crop}
                    />
                  </div>
                  <div className="mt-4 flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-2xl font-medium md:text-[1.75rem]">
                      {t(`home.kitchen.dishes.${key}.name`)}
                    </h3>
                    {price !== undefined && (
                      <p className="shrink-0 font-semibold text-maiz tabular-nums">
                        {formatPrice(lang, price)}
                      </p>
                    )}
                  </div>
                  <p className="mt-2 max-w-[38ch] leading-relaxed text-papel/75">
                    {t(`home.kitchen.dishes.${key}.text`)}
                  </p>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
