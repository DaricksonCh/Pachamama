import {
  RESTAURANT_INFO,
  addDays,
  nextOpening,
  openingStatus,
  toRestaurantLocal,
  upcomingClosure,
  weekSchedule,
  weekdayOfDate,
  type PublicOpeningHours,
} from '@pachamama/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOpeningHours } from '@/features/opening-hours/api';
import { useNow } from '@/features/opening-hours/use-now';
import { formatDayMonth, weekdayNames } from '@/features/opening-hours/weekday-names';
import { cn } from '@/lib/utils';
import { useLang } from '../use-lang';

/** One status sentence for today: open until…, opens at…, rest day or closed until… */
function useStatusText(data: PublicOpeningHours, now: Date): { text: string; open: boolean } {
  const { t } = useTranslation();
  const lang = useLang();
  const status = openingStatus(now, data);

  if (status.state === 'open')
    return { open: true, text: t('home.visit.status.open', { time: status.closes }) };
  if (status.state === 'opensLater')
    return { open: false, text: t('home.visit.status.opensLater', { time: status.opens }) };
  if (status.state === 'closure')
    return {
      open: false,
      text: t('home.visit.status.closure', { date: formatDayMonth(lang, status.until) }),
    };

  const today = weekdayOfDate(toRestaurantLocal(now).date);
  const restDay = weekSchedule(data.hours).find((d) => d.weekday === today)?.ranges.length === 0;
  const next = nextOpening(now, data);
  const base = restDay ? t('home.visit.status.restDay') : t('home.visit.status.closed');
  if (!next) return { open: false, text: base };
  const when =
    next.daysAhead === 1
      ? t('home.visit.status.tomorrow')
      : weekdayNames(lang, 'long')[next.weekday];
  return {
    open: false,
    text: t('home.visit.status.next', { base, when, time: next.opens }),
  };
}

function Hours({ data }: { data: PublicOpeningHours }) {
  const { t } = useTranslation();
  const lang = useLang();
  const now = useNow();
  const { text, open } = useStatusText(data, now);
  const today = weekdayOfDate(toRestaurantLocal(now).date);
  const narrow = weekdayNames(lang, 'narrow');
  const long = weekdayNames(lang, 'long');
  // The day line starts with the day's name, capitalised (es: "viernes" → "Viernes").
  const capitalise = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
  const closure = upcomingClosure(now, data);
  const week = weekSchedule(data.hours);
  const [selected, setSelected] = useState(today);
  // The next date that falls on the chosen weekday (today included), to catch a closure on it.
  const selectedDate = addDays(toRestaurantLocal(now).date, (selected - today + 7) % 7);
  const dayClosed = data.closures.some((c) => c.from <= selectedDate && selectedDate <= c.to);
  const selectedRanges = week.find((d) => d.weekday === selected)?.ranges ?? [];

  return (
    <>
      <p className="flex items-start gap-2.5 font-semibold" data-testid="home-opening-status">
        <span
          aria-hidden="true"
          className={cn(
            'mt-2 size-2.5 shrink-0 rounded-full',
            open
              ? 'bg-[#3f9a4f] shadow-[0_0_0_4px_rgba(63,154,79,0.2)]'
              : 'bg-aji shadow-[0_0_0_4px_rgba(200,64,42,0.18)]',
          )}
        />
        {text}
      </p>

      {/* The week as day buttons: today filled, rest days dashed, the chosen day ringed. */}
      <div
        role="group"
        aria-label={t('home.visit.pickDay')}
        className="my-2.5 flex gap-1 sm:gap-1.5"
        data-testid="home-week"
      >
        {week.map((day) => {
          const rest = day.ranges.length === 0;
          const isToday = day.weekday === today;
          const isSelected = day.weekday === selected;
          return (
            <button
              key={day.weekday}
              type="button"
              aria-pressed={isSelected}
              aria-label={long[day.weekday]}
              title={long[day.weekday]}
              onClick={() => setSelected(day.weekday)}
              data-today={isToday || undefined}
              data-rest={rest || undefined}
              className={cn(
                'grid size-9 cursor-pointer place-items-center rounded-full border-[1.5px] text-xs font-semibold transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selva motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:size-10 sm:text-[0.8rem]',
                rest
                  ? 'border-dashed border-muted-foreground text-muted-foreground line-through'
                  : 'border-selva text-selva',
                isToday && (rest ? 'bg-muted-foreground text-papel' : 'bg-selva text-papel'),
                isSelected && 'ring-2 ring-chicha ring-offset-2 ring-offset-background',
              )}
            >
              <span aria-hidden="true">{narrow[day.weekday]}</span>
            </button>
          );
        })}
      </div>

      <p
        className="mb-2 text-[0.95rem] tabular-nums"
        aria-live="polite"
        data-testid="home-day-hours"
      >
        <span className="font-semibold">
          {selected === today
            ? t('home.visit.todayLabel', { day: long[selected] })
            : capitalise(long[selected])}
        </span>
        {' · '}
        {dayClosed
          ? t('home.visit.dayClosed', { date: formatDayMonth(lang, selectedDate) })
          : selectedRanges.length === 0
            ? t('home.visit.dayRest')
            : selectedRanges.map((r) => `${r.opens}–${r.closes}`).join(', ')}
      </p>

      {closure && (
        <p className="mt-2 inline-block rounded bg-aji/10 px-2.5 py-0.5 text-sm font-semibold text-aji-deep">
          {t('home.visit.closureAhead', {
            from: formatDayMonth(lang, closure.from),
            to: formatDayMonth(lang, closure.to),
          })}
        </p>
      )}
    </>
  );
}

/**
 * Opening hours on the home page (ADR 0015): what the staff keep in the panel, read for today.
 * A status line and the week as day buttons; the chosen day's hours (today at first) show below. Falls back to the fixed text.
 */
export function HomeHours() {
  const { t } = useTranslation();
  const lang = useLang();
  const { data, isPending, isError } = useOpeningHours();

  if (data) return <Hours data={data} />;
  if (isPending) return <p className="text-muted-foreground">{t('contact.hoursBlock.loading')}</p>;
  return isError ? <p>{RESTAURANT_INFO.openingHours[lang]}</p> : null;
}
