import { publicPath, type Language } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PageHeader } from '@/components/public/page-header';
import { Photo } from '@/components/public/photo';
import { ReserveButton } from '@/components/public/reserve-button';
import { usePageMeta } from '@/components/public/use-page-meta';

const textLink =
  'rounded-sm font-semibold text-selva underline decoration-maiz decoration-2 underline-offset-[6px] hover:decoration-selva focus-visible:outline-2 focus-visible:outline-offset-4';

/** Story page. The real text is pending (docs/pendientes.md): placeholder copy plus a visible note. */
export function StoryPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  usePageMeta(t('pages.story.title'), t('pages.story.description'));

  return (
    <>
      <PageHeader title={t('pages.story.title')} lead={t('story.lead')} />

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:px-6 md:space-y-24 md:py-20">
        <p
          role="note"
          className="max-w-2xl border-l-4 border-maiz bg-secondary px-4 py-3 text-tierra"
        >
          {t('story.notice')}
        </p>

        <section aria-labelledby="origin-title" className="grid items-start gap-10 md:grid-cols-12">
          <div className="space-y-5 md:col-span-7">
            <h2
              id="origin-title"
              className="font-display text-4xl font-medium tracking-tight text-selva"
            >
              {t('story.originTitle')}
            </h2>
            <p className="max-w-prose leading-relaxed">{t('story.p1')}</p>
            <p className="max-w-prose leading-relaxed">{t('story.p2')}</p>
          </div>
          <div className="md:col-span-4 md:col-start-9 md:mt-12">
            <Photo
              photo="cocinera"
              alt={t('story.photos.cocinera')}
              sizes="(min-width: 768px) 33vw, 100vw"
              className="aspect-[3/4] rounded-md"
            />
          </div>
        </section>

        <section aria-labelledby="house-title" className="grid items-center gap-10 md:grid-cols-12">
          <div className="md:col-span-6">
            <Photo
              photo="equipo"
              alt={t('story.photos.equipo')}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="aspect-[1280/1091] rounded-md"
            />
          </div>
          <div className="space-y-5 md:col-span-5 md:col-start-8">
            <h2
              id="house-title"
              className="font-display text-4xl font-medium tracking-tight text-selva"
            >
              {t('story.houseTitle')}
            </h2>
            <p className="leading-relaxed">{t('story.p3')}</p>
            <div className="grid grid-cols-[1.6fr_1fr] items-end gap-4">
              <Photo
                photo="localInterior"
                alt={t('story.photos.interior')}
                sizes="(min-width: 768px) 25vw, 60vw"
                className="aspect-[16/10] rounded-md"
              />
              <Photo
                photo="localVertical"
                alt={t('story.photos.vertical')}
                sizes="(min-width: 768px) 15vw, 35vw"
                className="aspect-[9/16] rounded-md"
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="visit-title" className="space-y-5">
          <h2
            id="visit-title"
            className="font-display text-4xl font-medium tracking-tight text-selva"
          >
            {t('story.visitTitle')}
          </h2>
          <div className="flex flex-wrap items-center gap-6">
            <ReserveButton />
            <Link to={publicPath('menu', lang)} className={textLink}>
              {t('story.seeMenu')}
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
