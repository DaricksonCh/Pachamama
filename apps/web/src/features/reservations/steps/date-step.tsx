import { RESTAURANT_INFO } from '@pachamama/shared';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { de } from 'react-day-picker/locale/de';
import { es } from 'react-day-picker/locale/es';
import { textLinkClass } from '@/components/public/styles';
import { useLang } from '@/components/public/use-lang';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { useMonthAvailability } from '../use-availability';
import { fromIsoDate, restaurantToday, toIsoDate } from '../dates';

interface DateStepProps {
  query: ReturnType<typeof useMonthAvailability>;
  /** First day of the month shown in the calendar. */
  month: Date;
  onMonthChange: (month: Date) => void;
  date: string | undefined;
  onChange: (date: string) => void;
}

/** Step 2: pick a day. Only days the API lists for the month can be chosen. */
export function DateStep({ query, month, onMonthChange, date, onChange }: DateStepProps) {
  const { t } = useTranslation();
  const lang = useLang();
  const today = restaurantToday();
  const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() + 12, 1);
  const available = useMemo(() => new Set(query.data?.days ?? []), [query.data]);
  const loading = query.isPending || query.isPlaceholderData;

  return (
    <div className="space-y-5">
      <div
        aria-busy={loading}
        className="w-fit max-w-full rounded-md border border-border bg-white p-1 sm:p-3"
      >
        <Calendar
          mode="single"
          required
          locale={lang === 'es' ? es : de}
          weekStartsOn={1}
          today={today}
          month={month}
          onMonthChange={(next) => onMonthChange(new Date(next.getFullYear(), next.getMonth(), 1))}
          startMonth={firstMonth}
          endMonth={lastMonth}
          showOutsideDays={false}
          selected={date ? fromIsoDate(date) : undefined}
          onSelect={(selected) => selected && onChange(toIsoDate(selected))}
          disabled={(day) => !available.has(toIsoDate(day))}
          className="bg-transparent [--cell-size:--spacing(10)] sm:[--cell-size:--spacing(11)]"
        />
      </div>

      <div aria-live="polite" className="space-y-3">
        {loading && !query.isError ? (
          <p role="status" className="text-sm text-tierra/80">
            {t('reservations.date.loading')}
          </p>
        ) : null}
        {query.isSuccess && !query.isPlaceholderData && query.data.days.length === 0 ? (
          <p className="text-sm">{t('reservations.date.noDays')}</p>
        ) : null}
      </div>
      {query.isError ? (
        <div className="space-y-3">
          <p role="alert" className="font-medium text-aji">
            {t('reservations.errors.loadFailed')}
          </p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            {t('reservations.retry')}
          </Button>
        </div>
      ) : null}

      {query.data && !query.data.sameDayOnline ? (
        <p className="max-w-md text-sm leading-relaxed text-tierra/85">
          {t('reservations.date.sameDay')}{' '}
          <a href={`tel:${RESTAURANT_INFO.phone.e164}`} className={textLinkClass}>
            {RESTAURANT_INFO.phone.display}
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}
