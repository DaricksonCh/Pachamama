import {
  LEGAL_PLACEHOLDER,
  PRIVACY_POLICY_UPDATED,
  RESTAURANT_INFO,
  legalHasPlaceholders,
  publicPath,
} from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PageHeader } from '@/components/public/page-header';
import { ProvisionalMark } from '@/components/public/provisional-mark';
import { textLinkClass } from '@/components/public/styles';
import { useLang } from '@/components/public/use-lang';
import { usePageMeta } from '@/components/public/use-page-meta';

const h2 = 'font-display text-2xl font-medium tracking-tight text-selva';

type Section =
  | 'overview'
  | 'controller'
  | 'hosting'
  | 'cookies'
  | 'external'
  | 'contact'
  | 'rights'
  | 'authority'
  | 'updated';

/** Order of the sections and which paragraph keys each one has (text lives in the locale files). */
const SECTIONS: { id: Section; paragraphs: string[] }[] = [
  { id: 'overview', paragraphs: ['p1', 'p2'] },
  { id: 'controller', paragraphs: ['p1'] },
  { id: 'hosting', paragraphs: ['p1', 'p2', 'p3', 'p4'] },
  { id: 'cookies', paragraphs: ['p1', 'p2'] },
  { id: 'external', paragraphs: ['p1', 'p2'] },
  { id: 'contact', paragraphs: ['p1', 'p2'] },
  { id: 'rights', paragraphs: ['p1', 'p2'] },
  { id: 'authority', paragraphs: ['p1'] },
  { id: 'updated', paragraphs: ['p1'] },
];

/** Datenschutzerklärung. Describes only what the site really does; see docs/security-privacy.md. */
export function PrivacyPage() {
  const { t } = useTranslation();
  const lang = useLang();
  usePageMeta(t('pages.privacy.title'), t('pages.privacy.description'));
  const { legal, phone, email } = RESTAURANT_INFO;
  const provisional = legalHasPlaceholders();

  const value = (v: string) => (v === LEGAL_PLACEHOLDER ? t('privacy.pending') : v);
  const updated = new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'es-ES', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${PRIVACY_POLICY_UPDATED}T00:00:00Z`));
  const text = (section: Section, key: string) =>
    t(`privacy.sections.${section}.${key}`, {
      provider: value(legal.hostingProvider),
      retention: value(legal.logRetention),
      date: updated,
    });

  return (
    <>
      <PageHeader title={t('pages.privacy.title')} />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <div className="max-w-prose space-y-10">
          {provisional ? (
            <p role="note" className="border-l-4 border-maiz bg-secondary px-4 py-3 text-tierra">
              {t('privacy.notice')}
            </p>
          ) : null}
          {lang === 'es' ? (
            <p className="text-sm text-muted-foreground">{t('privacy.translationNote')}</p>
          ) : null}

          {SECTIONS.map(({ id, paragraphs }) => (
            <section key={id} aria-labelledby={`privacy-${id}`} className="space-y-3">
              <h2 id={`privacy-${id}`} className={h2}>
                {t(`privacy.sections.${id}.title`)}
              </h2>
              {paragraphs.map((p) => (
                <p key={p} className="leading-relaxed">
                  {text(id, p)}
                </p>
              ))}

              {id === 'controller' ? (
                <>
                  <address className="leading-relaxed not-italic">
                    {value(legal.operatorName)}
                    <br />
                    {legal.address.street}
                    <br />
                    {legal.address.postalCode} {legal.address.city}
                    <br />
                    <a href={`tel:${phone.e164}`} className={textLinkClass}>
                      {phone.display}
                    </a>
                    <ProvisionalMark />
                    <br />
                    <a href={`mailto:${email}`} className={textLinkClass}>
                      {email}
                    </a>
                    <ProvisionalMark />
                  </address>
                  <p className="leading-relaxed">
                    <Link to={publicPath('imprint', lang)} className={textLinkClass}>
                      {t('privacy.sections.controller.imprintLink')}
                    </Link>
                  </p>
                </>
              ) : null}

              {id === 'authority' ? (
                <p className="leading-relaxed font-semibold" lang="de">
                  {t('privacy.sections.authority.name')}
                </p>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
