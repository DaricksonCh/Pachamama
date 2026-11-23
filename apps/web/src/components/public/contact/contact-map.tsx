import { useTranslation } from 'react-i18next';
import { textLinkClass } from '../styles';
import { useReveal } from '../use-reveal';

const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=Am+Gaswerk+1,+28197+Bremen';
const OSM_URL =
  'https://www.openstreetmap.org/?mlat=53.0753555&mlon=8.7835367#map=17/53.0753555/8.7835367';
const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

/**
 * Contact block 3: the local static map (ADR 0011) taped onto the page like a photo, with a
 * handwritten note, and the directions and external map links next to it.
 */
export function ContactMap() {
  const { t } = useTranslation();
  const textRef = useReveal<HTMLDivElement>();

  return (
    <section
      aria-labelledby="how-title"
      className="mx-auto grid max-w-6xl items-center gap-14 overflow-x-clip px-4 py-20 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:py-28"
    >
      <figure className="relative m-0 rotate-[1.4deg] bg-white p-3 pb-12 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.45)]">
        <span
          aria-hidden="true"
          className="absolute -top-3 -left-5 h-7 w-28 -rotate-[28deg] bg-maiz/75"
        />
        <span
          aria-hidden="true"
          className="absolute -top-3 -right-5 h-7 w-28 rotate-[24deg] bg-maiz/75"
        />
        <img
          src="/images/map/kontakt-karte.webp"
          alt={t('contact.mapAlt')}
          width={512}
          height={384}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
        <figcaption
          aria-hidden="true"
          className="absolute bottom-2 left-4 font-script text-2xl text-selva"
        >
          {t('contact.mapNoteScript')}
        </figcaption>
      </figure>

      <div ref={textRef} className="space-y-4">
        <h2
          id="how-title"
          className="font-display text-4xl font-medium tracking-tight text-selva md:text-5xl"
        >
          {t('contact.howTitle')}
        </h2>
        <p className="text-lg leading-relaxed">{t('contact.howText')}</p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          <li>
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={textLinkClass}
            >
              {t('contact.openGoogle')}
              <span className="sr-only"> {t('contact.newTab')}</span>
            </a>
          </li>
          <li>
            <a href={OSM_URL} target="_blank" rel="noopener noreferrer" className={textLinkClass}>
              {t('contact.openOsm')}
              <span className="sr-only"> {t('contact.newTab')}</span>
            </a>
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          <a
            href={OSM_COPYRIGHT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            {t('contact.mapAttribution')}
            <span className="sr-only"> {t('contact.newTab')}</span>
          </a>{' '}
          {t('contact.mapLicense')}
          <span className="block">{t('contact.mapNote')}</span>
        </p>
      </div>
    </section>
  );
}
