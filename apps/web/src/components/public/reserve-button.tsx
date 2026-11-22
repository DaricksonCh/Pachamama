import {
  RESERVATIONS_MODE,
  RESTAURANT_INFO,
  publicPath,
  type Language,
  type ReservationsMode,
} from '@pachamama/shared';
import { Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

type Tone = 'onDark' | 'onLight';

const toneClasses: Record<Tone, string> = {
  onDark:
    'bg-maiz text-tierra hover:bg-[#ecc25a] focus-visible:outline-maiz focus-visible:outline-offset-4',
  onLight:
    'bg-selva text-papel hover:bg-selva-deep focus-visible:outline-selva focus-visible:outline-offset-2',
};

interface ReserveButtonProps {
  tone?: Tone;
  className?: string;
  /** Overrides the global mode (tests and the phase 7 switch). */
  mode?: ReservationsMode;
}

/**
 * The single "Reserve a table" call to action. Until phase 7 it opens a phone call; with
 * `RESERVATIONS_MODE = 'form'` every instance links to the reservations page instead.
 */
export function ReserveButton({
  tone = 'onLight',
  className,
  mode = RESERVATIONS_MODE,
}: ReserveButtonProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const classes = cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2.5 font-semibold transition-colors focus-visible:outline-2',
    toneClasses[tone],
    className,
  );

  if (mode === 'form') {
    return (
      <Link to={publicPath('reservations', lang)} className={classes}>
        {t('reserve.cta')}
      </Link>
    );
  }

  return (
    <a
      href={`tel:${RESTAURANT_INFO.phone.e164}`}
      // The accessible name starts with the visible text (WCAG 2.5.3) and adds the phone number.
      aria-label={`${t('reserve.cta')} ${t('reserve.byPhone', { phone: RESTAURANT_INFO.phone.display })}`}
      className={classes}
    >
      <Phone aria-hidden="true" className="size-4" />
      {t('reserve.cta')}
    </a>
  );
}
