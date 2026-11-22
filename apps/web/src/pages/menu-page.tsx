import { ALLERGENS, type AllergenCode, type Language, type PublicMenu } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/public/page-header';
import { usePageMeta } from '@/components/public/use-page-meta';
import { Skeleton } from '@/components/ui/skeleton';
import { menuPdfUrl } from '@/features/menu/pdf-url';
import { usePublicMenu } from '@/features/menu/public-api';

type Category = PublicMenu['categories'][number];
type Dish = Category['dishes'][number];

const textLink =
  'rounded-sm font-semibold text-selva underline decoration-maiz decoration-2 underline-offset-[6px] hover:decoration-selva focus-visible:outline-2 focus-visible:outline-offset-4';

const pickText = (lang: Language, de: string, es: string) => (lang === 'de' ? de : es);

/** Opens the PDF in a new tab, like the admin panel does. */
function PdfLink({ tone }: { tone: 'onDark' | 'onLight' }) {
  const { t, i18n } = useTranslation();
  const style =
    tone === 'onDark'
      ? 'inline-flex min-h-11 items-center rounded-md border border-papel/60 px-5 py-2.5 font-semibold hover:bg-papel/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-maiz'
      : textLink;
  return (
    <a href={menuPdfUrl(i18n.language)} target="_blank" rel="noopener noreferrer" className={style}>
      {t('menu.pdf')}
      <span className="sr-only"> {t('menu.pdfHint')}</span>
    </a>
  );
}

function MenuSkeleton() {
  const { t } = useTranslation();
  return (
    <div
      aria-busy="true"
      className="mx-auto max-w-6xl space-y-12 px-4 py-12 sm:px-6"
      data-testid="menu-loading"
    >
      <p role="status" className="sr-only">
        {t('menu.loading')}
      </p>
      {[0, 1].map((group) => (
        <div key={group} className="space-y-6">
          <Skeleton className="block h-9 w-56" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="space-y-2">
              <Skeleton className="block h-6 w-2/3 max-w-sm" />
              <Skeleton className="block h-4 w-full max-w-xl" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DishItem({ dish, lang }: { dish: Dish; lang: Language }) {
  const { t } = useTranslation();
  const price = new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(dish.price);
  const description = pickText(lang, dish.descriptionDe ?? '', dish.descriptionEs ?? '');
  const { image } = dish;

  return (
    <li className="flex gap-4 py-6 sm:gap-6">
      {image ? (
        <img
          src={image.url.w400}
          srcSet={`${image.url.w400} 400w, ${image.url.w800} 800w`}
          sizes="(min-width: 640px) 160px, 96px"
          alt=""
          loading="lazy"
          decoding="async"
          className="size-24 shrink-0 rounded-md object-cover sm:size-40"
        />
      ) : null}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-2xl text-selva">
            {pickText(lang, dish.nameDe, dish.nameEs)}
          </h3>
          <p className="shrink-0 font-semibold tabular-nums">{price}</p>
        </div>
        {description ? <p className="max-w-prose text-muted-foreground">{description}</p> : null}
        {dish.diet || dish.allergens.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {dish.diet ? (
              <span className="rounded-full bg-secondary px-3 py-0.5 font-semibold text-selva">
                {t(`menu.diet.${dish.diet}`)}
              </span>
            ) : null}
            {dish.allergens.length > 0 ? (
              <ul aria-label={t('menu.allergens')} className="flex flex-wrap gap-1.5">
                {dish.allergens.map((code) => (
                  <li
                    key={code}
                    title={ALLERGENS[code][lang]}
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
      </div>
    </li>
  );
}

function CategoryNav({ categories, lang }: { categories: Category[]; lang: Language }) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('menu.categoriesNav')}
      className="sticky top-0 z-20 border-b border-tierra/15 bg-papel"
    >
      <ul className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 py-1 sm:px-6">
        {categories.map((category) => (
          <li key={category.id} className="shrink-0">
            <a
              href={`#category-${category.id}`}
              className="inline-flex min-h-11 items-center font-semibold text-selva underline decoration-maiz decoration-2 underline-offset-[6px] hover:decoration-selva focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
            >
              {pickText(lang, category.nameDe, category.nameEs)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MenuContent({ menu, lang }: { menu: PublicMenu; lang: Language }) {
  const { t } = useTranslation();
  const used = [
    ...new Set(menu.categories.flatMap((c) => c.dishes.flatMap((d) => d.allergens))),
  ].sort() as AllergenCode[];

  return (
    <>
      <CategoryNav categories={menu.categories} lang={lang} />
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {menu.categories.map((category) => {
          const description = pickText(
            lang,
            category.descriptionDe ?? '',
            category.descriptionEs ?? '',
          );
          return (
            <section
              key={category.id}
              id={`category-${category.id}`}
              aria-labelledby={`category-${category.id}-title`}
              className="scroll-mt-16 pt-12"
            >
              <h2
                id={`category-${category.id}-title`}
                className="font-display text-4xl font-medium tracking-tight text-selva"
              >
                {pickText(lang, category.nameDe, category.nameEs)}
              </h2>
              {description ? (
                <p className="mt-2 max-w-prose text-lg text-muted-foreground">{description}</p>
              ) : null}
              <ul className="mt-4 divide-y divide-tierra/15">
                {category.dishes.map((dish) => (
                  <DishItem key={dish.id} dish={dish} lang={lang} />
                ))}
              </ul>
            </section>
          );
        })}

        <section
          aria-labelledby="allergen-legend-title"
          className="mt-16 border-t border-tierra/15 pt-8"
        >
          <h2 id="allergen-legend-title" className="font-display text-2xl text-selva">
            {t('menu.legendTitle')}
          </h2>
          {used.length > 0 ? (
            <dl className="mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {used.map((code) => (
                <div key={code} className="flex gap-2">
                  <dt className="w-5 font-semibold">{code}</dt>
                  <dd>{ALLERGENS[code][lang]}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <p className="mt-4 text-muted-foreground">{t('menu.askStaff')}</p>
        </section>
      </div>
    </>
  );
}

export function MenuPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const { data, isPending, isError, refetch, isFetching } = usePublicMenu();
  usePageMeta(t('pages.menu.title'), t('pages.menu.description'));

  const categories = data?.categories.filter((c) => c.dishes.length > 0);

  return (
    <>
      <PageHeader
        title={t('pages.menu.title')}
        lead={t('menu.lead')}
        aside={<PdfLink tone="onDark" />}
      />
      {isPending ? <MenuSkeleton /> : null}
      {isError ? (
        <div role="alert" className="mx-auto max-w-6xl space-y-4 px-4 py-16 sm:px-6">
          <p className="text-lg">{t('menu.error')}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex min-h-11 items-center rounded-md bg-selva px-5 py-2.5 font-semibold text-papel hover:bg-selva/90 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {t('menu.retry')}
          </button>
        </div>
      ) : null}
      {categories && categories.length === 0 ? (
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-16 sm:px-6">
          <p className="text-lg">{t('menu.empty')}</p>
          <PdfLink tone="onLight" />
        </div>
      ) : null}
      {categories && categories.length > 0 ? (
        <MenuContent menu={{ categories }} lang={lang} />
      ) : null}
    </>
  );
}
