import { RESTAURANT_INFO, toRestaurantLocal } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Photo } from '../photo';
import { useLang } from '../use-lang';

/** Today's date as a postmark shows it (dd.mm.yyyy), in restaurant time. */
function postmarkDate(): string {
  const [y, m, d] = toRestaurantLocal(new Date()).date.split('-');
  return `${d}.${m}.${y}`;
}

/**
 * Contact block 1: the page title and a postcard "sent from Peru". Photo on the front, and on the
 * back a handwritten greeting, a stamp with the logo, a postmark and the real address.
 */
export function ContactPostcard() {
  const { t } = useTranslation();
  const lang = useLang();
  const { address } = RESTAURANT_INFO;

  return (
    <section
      aria-labelledby="contact-title"
      className="bg-[radial-gradient(circle_at_20%_10%,#efe9d6_0,var(--color-papel)_60%)] pt-12 pb-20 md:pt-16 md:pb-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h1
          id="contact-title"
          className="font-display text-4xl font-medium tracking-tight text-selva sm:text-5xl md:text-6xl"
        >
          {t('pages.contact.title')}
        </h1>
        <p className="mt-3 mb-10 max-w-xl text-lg text-muted-foreground md:mb-14">
          {t('contact.lead')}
        </p>

        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-sm bg-[#fffdf7] shadow-[0_30px_60px_-30px_rgba(31,42,29,0.45)] motion-safe:animate-hero-in md:-rotate-[1.5deg] md:grid-cols-2">
          <div className="relative min-h-60 bg-tierra">
            <Photo
              photo="localInterior"
              alt={t('contact.postcard.photoAlt')}
              sizes="(min-width: 768px) 32rem, 100vw"
              priority
              className="absolute inset-0 h-full w-full object-cover"
            />
            <p
              aria-hidden="true"
              lang="es"
              className="absolute bottom-4 left-5 -rotate-3 font-script text-4xl text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.6)] sm:text-5xl"
            >
              ¡Hola, Bremen!
            </p>
          </div>

          <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_1px_1fr]">
            <p className="font-script text-3xl leading-tight text-chicha">
              {t('contact.postcard.message')}
              <span className="mt-4 block text-2xl text-tierra">
                {t('contact.postcard.signature')}
              </span>
            </p>
            <span aria-hidden="true" className="hidden bg-border lg:block" />

            <div className="relative">
              <Stamp />
              <Postmark date={postmarkDate()} city={address.city} lang={lang} />
              <address className="mt-6 font-script text-3xl leading-none not-italic lg:mt-16">
                <span className="block border-b border-border py-2">Pachamama</span>
                <span className="block border-b border-border py-2">{address.street}</span>
                <span className="block border-b border-border py-2">
                  {address.postalCode} {address.city}
                </span>
              </address>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Perforated stamp with the logo (decorative). */
function Stamp() {
  return (
    <div
      aria-hidden="true"
      className="ml-auto h-28 w-24 bg-[radial-gradient(circle,transparent_4px,#fffdf7_4.5px)] bg-[length:12px_12px] bg-[position:-6px_-6px] p-[7px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]"
    >
      <div className="flex h-full flex-col items-center justify-center gap-1 bg-selva p-1.5 text-center font-display text-xs text-maiz">
        <img src="/images/logo-mark.png" alt="" width={44} height={44} className="size-11" />
        Perú
      </div>
    </div>
  );
}

/** Round postmark with wavy cancel lines (decorative): city and today's date. */
function Postmark({ date, city, lang }: { date: string; city: string; lang: string }) {
  return (
    <div
      aria-hidden="true"
      lang={lang}
      className="absolute top-8 right-16 grid size-24 -rotate-12 place-items-center rounded-full border-2 border-aji-deep/70 text-center text-[0.65rem] leading-tight font-semibold tracking-wide text-aji-deep"
    >
      <span>
        {city.toUpperCase()}
        <br />
        {date}
      </span>
      <span className="absolute top-1/2 -right-10 -left-14 -z-10 h-5 -translate-y-1/2 bg-[repeating-linear-gradient(180deg,rgba(200,64,42,0.5)_0_2px,transparent_2px_6px)] [mask-image:linear-gradient(90deg,transparent,#000_30%,#000_70%,transparent)]" />
    </div>
  );
}
