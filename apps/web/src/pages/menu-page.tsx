import { ALLERGENS, type AllergenCode, type Language, type PublicMenu } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { MenuBand } from '@/components/public/menu/menu-band';
import { MenuLoom } from '@/components/public/menu/menu-loom';
import { textLinkClass } from '@/components/public/styles';
import { useLang } from '@/components/public/use-lang';
import { usePageMeta } from '@/components/public/use-page-meta';
import { Skeleton } from '@/components/ui/skeleton';
import { menuPdfUrl } from '@/features/menu/pdf-url';
import { usePublicMenu } from '@/features/menu/public-api';

/** Opens the PDF in a new tab, like the admin panel does. */
function PdfLink() {
  const { t } = useTranslation();
  const lang = useLang();
  return (
    <a href={menuPdfUrl(lang)} target="_blank" rel="noopener noreferrer" className={textLinkClass}>
      {t('menu.pdf')}
      <span className="sr-only"> {t('menu.pdfHint')}</span>
    </a>
  );
}

/** Light opening of the menu (ADR 0016): title, the manta line in handwriting and the PDF. */
function MenuHero() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-4 pt-12 pb-10 sm:px-6 md:pt-16">
      <div className="max-w-2xl">
        <h1 className="font-display text-display font-medium tracking-tight break-words hyphens-auto text-selva motion-safe:animate-hero-in">
          {t('pages.menu.title')}
        </h1>
        <p className="mt-1 font-script text-2xl text-chicha sm:text-3xl">{t('menu.tagline')}</p>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t('menu.lead')}</p>
      </div>
      <PdfLink />
    </div>
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
          <Skeleton className="block h-20 w-full" />
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

function MenuContent({ menu, lang }: { menu: PublicMenu; lang: Language }) {
  const { t } = useTranslation();
  const used = [
    ...new Set(menu.categories.flatMap((c) => c.dishes.flatMap((d) => d.allergens))),
  ].sort() as AllergenCode[];

  return (
    <>
      <MenuLoom categories={menu.categories} lang={lang} />
      {menu.categories.map((category, index) => (
        <MenuBand key={category.id} category={category} index={index} lang={lang} />
      ))}
      <section aria-labelledby="allergen-legend-title" className="bg-secondary">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h2 id="allergen-legend-title" className="font-display text-2xl text-selva">
            {t('menu.legendTitle')}
          </h2>
          {used.length > 0 ? (
            <dl className="mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {used.map((code) => (
                <div key={code} className="flex gap-2">
                  <dt className="min-w-5 font-semibold">{code}</dt>
                  <dd>{ALLERGENS[code][lang]}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <p className="mt-4 text-muted-foreground">{t('menu.askStaff')}</p>
        </div>
      </section>
    </>
  );
}

export function MenuPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const { data, isPending, isError, refetch, isFetching } = usePublicMenu();
  usePageMeta(t('pages.menu.title'), t('pages.menu.description'));

  const categories = data?.categories.filter((c) => c.dishes.length > 0);

  return (
    <>
      <MenuHero />
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
          <PdfLink />
        </div>
      ) : null}
      {categories && categories.length > 0 ? (
        <MenuContent menu={{ categories }} lang={lang} />
      ) : null}
    </>
  );
}
