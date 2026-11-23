import {
  RESTAURANT_INFO,
  openingStatus,
  toRestaurantLocal,
  weekSchedule,
  weekdayOfDate,
  type PublicOpeningHours,
} from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { useOpeningHours } from '@/features/opening-hours/api';
import { useNow } from '@/features/opening-hours/use-now';
import { formatDayMonth, weekdayNames } from '@/features/opening-hours/weekday-names';
import { cn } from '@/lib/utils';
import { useLang } from '../use-lang';
import { useReveal } from '../use-reveal';
import { Quipu } from './quipu';

function StatusLine({ data, now }: { data: PublicOpeningHours; now: Date }) {
  const { t, i18n } = useTranslation();
  const status = openingStatus(now, data);
  const open = status.state === 'open';
  let text: string;
  if (status.state === 'open') text = t('contact.hoursBlock.status.open', { time: status.closes });
  else if (status.state === 'opensLater')
    text = t('contact.hoursBlock.status.opensLater', { time: status.opens });
  else if (status.state === 'closure') {
    const date = formatDayMonth(i18n.language, status.until);
    text = t('contact.hoursBlock.status.closure', { date });
  } else text = t('contact.hoursBlock.status.closed');

  return (
    <p className="mt-4 flex items-center gap-3 text-lg" data-testid="opening-status">
      <span
        aria-hidden="true"
        className={cn(
          'size-3 rounded-full',
          open
            ? 'bg-[#7bc47f] shadow-[0_0_0_5px_rgba(123,196,127,0.2)]'
            : 'bg-aji shadow-[0_0_0_5px_rgba(200,64,42,0.3)]',
        )}
      />
      {text}
    </p>
  );
}

/**
 * Contact block 2: when we cook. The opening hours the staff keep in the panel, as a live status,
 * a plain list and a quipu; phone and email underneath. If the API fails, the fixed text is shown.
 */
export function ContactHours() {
  const { t } = useTranslation();
  const lang = useLang();
  const now = useNow();
  const { data, isPending, isError } = useOpeningHours();
  const quipuRef = useReveal<HTMLDivElement>();
  const { phone, email, openingHours } = RESTAURANT_INFO;
  const today = weekdayOfDate(toRestaurantLocal(now).date);
  const longNames = weekdayNames(lang, 'long');
  const shortNames = weekdayNames(lang, 'short');

  return (
    <section aria-labelledby="hours-title" className="bg-selva py-20 text-papel md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-start gap-12 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
          <div>
            <h2
              id="hours-title"
              className="font-display text-4xl font-medium tracking-tight md:text-5xl"
            >
              {t('contact.hoursBlock.title')}
            </h2>

            {data && <StatusLine data={data} now={now} />}
            <p
              aria-hidden="true"
              className="mt-7 max-w-sm font-script text-3xl leading-tight text-maiz"
            >
              {t('contact.hoursBlock.script')}
            </p>
            <p className="mt-3 max-w-sm text-sm text-papel/80">{t('contact.hoursBlock.legend')}</p>

            {isError && <p className="mt-6 text-lg">{openingHours[lang]}</p>}
            {isPending && <p className="mt-6 text-papel/80">{t('contact.hoursBlock.loading')}</p>}
            {data && (
              <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 tabular-nums">
                {weekSchedule(data.hours).map((day) => (
                  <div key={day.weekday} className="contents">
                    <dt className={cn(day.weekday === today && 'font-semibold text-maiz')}>
                      {longNames[day.weekday]}
                    </dt>
                    <dd className={cn(day.weekday === today && 'font-semibold text-maiz')}>
                      {day.ranges.length === 0
                        ? t('contact.hoursBlock.rest')
                        : day.ranges.map((r) => `${r.opens}–${r.closes}`).join(', ')}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {!isError && (
            <div ref={quipuRef} className="quipu-reveal pt-2">
              <Quipu
                hours={data?.hours ?? []}
                today={today}
                dayLabels={shortNames}
                restLabel={t('contact.hoursBlock.rest')}
                pending={isPending}
              />
            </div>
          )}
        </div>

        <div className="mt-14 flex flex-wrap justify-center gap-x-14 gap-y-4 border-t border-papel/20 pt-10">
          <a
            href={`tel:${phone.e164}`}
            className="font-display text-2xl underline decoration-maiz decoration-2 underline-offset-8 hover:text-maiz focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-maiz sm:text-3xl"
          >
            <span className="sr-only">{t('contact.phone')}: </span>
            {phone.display}
          </a>
          <a
            href={`mailto:${email}`}
            className="max-w-full min-w-0 text-center font-display text-lg [overflow-wrap:anywhere] underline decoration-maiz decoration-2 underline-offset-8 hover:text-maiz focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-maiz sm:text-3xl"
          >
            <span className="sr-only">{t('contact.email')}: </span>
            {email}
          </a>
        </div>
      </div>
    </section>
  );
}
