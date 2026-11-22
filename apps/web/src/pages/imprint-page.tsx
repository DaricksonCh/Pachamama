import { LEGAL_PLACEHOLDER, RESTAURANT_INFO, legalHasPlaceholders } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/public/page-header';
import { usePageMeta } from '@/components/public/use-page-meta';

const textLink =
  'rounded-sm font-semibold text-selva underline decoration-maiz decoration-2 underline-offset-[6px] hover:decoration-selva focus-visible:outline-2 focus-visible:outline-offset-4';

const h2 = 'font-display text-2xl font-medium tracking-tight text-selva';

/** Impressum (§ 5 DDG). German is binding; Spanish is a courtesy translation of the same content. */
export function ImprintPage() {
  const { t, i18n } = useTranslation();
  usePageMeta(t('pages.imprint.title'), t('pages.imprint.description'));
  const { legal, phone, email } = RESTAURANT_INFO;
  const provisional = legalHasPlaceholders();

  const value = (v: string) => (v === LEGAL_PLACEHOLDER ? t('imprint.pending') : v);

  return (
    <>
      <PageHeader title={t('pages.imprint.title')} />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <div className="max-w-prose space-y-10">
          {provisional ? (
            <p role="note" className="border-l-4 border-maiz bg-secondary px-4 py-3 text-tierra">
              {t('imprint.notice')}
            </p>
          ) : null}
          {i18n.language === 'es' ? (
            <p className="text-sm text-muted-foreground">{t('imprint.translationNote')}</p>
          ) : null}

          <section aria-labelledby="imprint-provider" className="space-y-5">
            <h2 id="imprint-provider" className={h2}>
              {t('imprint.provider.title')}
            </h2>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-[minmax(0,12rem)_1fr]">
              <dt className="font-semibold">{t('imprint.provider.operator')}</dt>
              <dd>{value(legal.operatorName)}</dd>
              <dt className="font-semibold">{t('imprint.provider.legalForm')}</dt>
              <dd>{value(legal.legalForm)}</dd>
              <dt className="font-semibold">{t('imprint.provider.representative')}</dt>
              <dd>{value(legal.representative)}</dd>
              <dt className="font-semibold">{t('imprint.provider.address')}</dt>
              <dd>
                <address className="not-italic">
                  {legal.address.street}
                  <br />
                  {legal.address.postalCode} {legal.address.city}
                </address>
              </dd>
              <dt className="font-semibold">{t('imprint.provider.phone')}</dt>
              <dd>
                <a href={`tel:${phone.e164}`} className={textLink}>
                  {phone.display}
                </a>
              </dd>
              <dt className="font-semibold">{t('imprint.provider.email')}</dt>
              <dd>
                <a href={`mailto:${email}`} className={textLink}>
                  {email}
                </a>
              </dd>
              <dt className="font-semibold">{t('imprint.provider.vatId')}</dt>
              <dd>{value(legal.vatId)}</dd>
              <dt className="font-semibold">{t('imprint.provider.register')}</dt>
              <dd>{value(legal.commercialRegister)}</dd>
              <dt className="font-semibold">{t('imprint.provider.responsible')}</dt>
              <dd>{value(legal.contentResponsible)}</dd>
            </dl>
          </section>

          <section aria-labelledby="imprint-disputes" className="space-y-3">
            <h2 id="imprint-disputes" className={h2}>
              {t('imprint.disputes.title')}
            </h2>
            <p className="leading-relaxed">{t('imprint.disputes.body')}</p>
            {provisional ? (
              <p className="text-sm text-muted-foreground">{t('imprint.disputes.toConfirm')}</p>
            ) : null}
          </section>

          <section aria-labelledby="imprint-links" className="space-y-3">
            <h2 id="imprint-links" className={h2}>
              {t('imprint.links.title')}
            </h2>
            <p className="leading-relaxed">{t('imprint.links.body')}</p>
          </section>
        </div>
      </div>
    </>
  );
}
