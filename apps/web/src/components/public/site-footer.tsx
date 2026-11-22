import { RESTAURANT_INFO, publicPath, type Language } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { WovenStripe } from './woven-stripe';

const footerLink =
  'rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maiz';

export function SiteFooter() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const { address, phone, email, openingHours } = RESTAURANT_INFO;

  return (
    <footer className="mt-auto bg-selva text-papel">
      <WovenStripe />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <p className="font-display text-3xl font-semibold">Pachamama</p>
          <p className="max-w-xs text-papel/80">{t('footer.claim')}</p>
        </div>

        <address className="space-y-1 not-italic">
          <p className="mb-2 font-semibold text-maiz">{t('footer.visit')}</p>
          <p>{address.street}</p>
          <p>
            {address.postalCode} {address.city}
          </p>
          <p className="pt-2">{openingHours[lang]}</p>
        </address>

        <div className="space-y-1">
          <p className="mb-2 font-semibold text-maiz">{t('footer.contact')}</p>
          <p>
            <a href={`tel:${phone.e164}`} className={footerLink}>
              {phone.display}
            </a>
          </p>
          <p>
            <a href={`mailto:${email}`} className={footerLink}>
              {email}
            </a>
          </p>
        </div>
      </div>
      <div className="border-t border-papel/15">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 text-sm text-papel/80 sm:px-6">
          <p>
            © {new Date().getFullYear()} {RESTAURANT_INFO.name}
          </p>
          <ul className="flex gap-5">
            <li>
              <Link to={publicPath('imprint', lang)} className={footerLink}>
                {t('nav.imprint')}
              </Link>
            </li>
            <li>
              <Link to={publicPath('privacy', lang)} className={footerLink}>
                {t('nav.privacy')}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
