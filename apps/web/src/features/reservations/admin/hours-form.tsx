import { zodResolver } from '@hookform/resolvers/zod';
import { openingHoursSchema, type OpeningHoursRange } from '@pachamama/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { FormErrorSummary } from '@/features/menu/form-error-summary';
import { errorKey } from '@/features/menu/form-errors';
import { ApiError } from '@/lib/api';
import { useSaveHours } from './settings-api';

const formSchema = z.object({ ranges: openingHoursSchema });
type FormValues = { ranges: OpeningHoursRange[] };

/** La semana se muestra de lunes a domingo; en los datos el domingo es 0. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Cuadrícula de 30 minutos; el cierre más tarde que admite el esquema es 23:30. */
const GRID: string[] = Array.from({ length: 36 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 === 0 ? '00' : '30'}`;
});

const weekOrderIndex = (weekday: number) => WEEK_ORDER.indexOf(weekday as never);

function sortRanges(ranges: OpeningHoursRange[]): OpeningHoursRange[] {
  return [...ranges].sort(
    (a, b) =>
      weekOrderIndex(a.weekday) - weekOrderIndex(b.weekday) || a.opens.localeCompare(b.opens),
  );
}

function TimeSelect({
  id,
  value,
  label,
  describedBy,
  invalid,
  ...rest
}: {
  id: string;
  value: string;
  label: string;
  describedBy?: string;
  invalid: boolean;
} & React.ComponentProps<'select'>) {
  // Un valor guardado fuera de la cuadrícula sigue siendo visible (no se pierde en silencio).
  const options = GRID.includes(value) ? GRID : [value, ...GRID];
  return (
    <NativeSelect
      id={id}
      aria-label={label}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
      className="w-28"
      {...rest}
    >
      {options.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </NativeSelect>
  );
}

/** Horario semanal: 0..n tramos por día. Guarda la semana completa (PUT). */
export function HoursForm({
  hours,
  hoursConfirmed,
  onDirtyChange,
}: {
  hours: OpeningHoursRange[];
  hoursConfirmed: boolean;
  onDirtyChange: (id: string, dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const save = useSaveHours();
  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setFocus,
    formState: { errors, isDirty, isSubmitting, submitCount },
  } = useForm<FormValues>({
    shouldFocusError: false,
    resolver: zodResolver(formSchema),
    defaultValues: { ranges: sortRanges(hours) },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'ranges' });

  useEffect(() => {
    onDirtyChange('hours', isDirty);
    return () => onDirtyChange('hours', false);
  }, [isDirty, onDirtyChange]);

  const day = (weekday: number) => t(`admin.reservationSettings.weekdays.${weekday}`);

  const rangeError = (index: number): string | undefined => {
    const entry = errors.ranges?.[index];
    return errorKey(entry?.message ?? entry?.closes?.message ?? entry?.opens?.message);
  };

  const onSubmit = handleSubmit(async (values) => {
    const ranges = sortRanges(values.ranges);
    try {
      await save.mutateAsync(ranges);
      reset({ ranges });
      toast.success(t('admin.reservationSettings.hours.saved'));
    } catch (err) {
      toast.error(
        t(
          err instanceof ApiError && err.status === 403
            ? 'admin.reservationSettings.forbidden'
            : 'admin.reservationSettings.saveFailed',
        ),
      );
    }
  });

  // Un tramo erróneo se localiza por día y número de tramo dentro de ese día.
  const ordinal = (index: number) => {
    const weekday = getValues(`ranges.${index}.weekday`);
    return getValues('ranges')
      .slice(0, index + 1)
      .filter((r) => r.weekday === weekday).length;
  };
  const invalidIndexes = fields.map((_, i) => i).filter((i) => rangeError(i));

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold">
          {t('admin.reservationSettings.hours.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('admin.reservationSettings.hours.intro')}
        </p>
      </div>
      {hoursConfirmed ? null : (
        <p
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {t('admin.reservationSettings.hours.provisional')}
        </p>
      )}
      {submitCount > 0 ? (
        <FormErrorSummary
          attempt={submitCount}
          items={invalidIndexes.map((index) => ({
            id: `hours-${index}-closes`,
            label: t('admin.reservationSettings.hours.summaryItem', {
              day: day(getValues(`ranges.${index}.weekday`)),
              n: ordinal(index),
            }),
            message: rangeError(index) ?? '',
            focus: () => setFocus(`ranges.${index}.closes`),
          }))}
        />
      ) : null}

      <ul className="divide-y rounded-md border">
        {WEEK_ORDER.map((weekday) => {
          const indexes = fields
            .map((f, i) => (f.weekday === weekday ? i : -1))
            .filter((i) => i >= 0);
          const dayErrors = indexes.map(rangeError).filter((m): m is string => Boolean(m));
          const errorId = `hours-day-${weekday}-error`;
          return (
            <li
              key={weekday}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-4"
            >
              <span className="w-28 shrink-0 pt-2 font-medium">{day(weekday)}</span>
              <div className="flex-1 space-y-2">
                {indexes.length === 0 ? (
                  <p className="pt-2 text-sm text-muted-foreground">
                    {t('admin.reservationSettings.hours.closed')}
                  </p>
                ) : null}
                {indexes.map((index, position) => {
                  const n = position + 1;
                  const invalid = Boolean(rangeError(index));
                  const describedBy = dayErrors.length > 0 ? errorId : undefined;
                  return (
                    <div key={fields[index]?.id} className="flex flex-wrap items-center gap-2">
                      <TimeSelect
                        id={`hours-${index}-opens`}
                        label={t('admin.reservationSettings.hours.opens', { day: day(weekday), n })}
                        value={getValues(`ranges.${index}.opens`)}
                        invalid={invalid}
                        describedBy={describedBy}
                        {...register(`ranges.${index}.opens`)}
                      />
                      <span aria-hidden="true">–</span>
                      <TimeSelect
                        id={`hours-${index}-closes`}
                        label={t('admin.reservationSettings.hours.closes', {
                          day: day(weekday),
                          n,
                        })}
                        value={getValues(`ranges.${index}.closes`)}
                        invalid={invalid}
                        describedBy={describedBy}
                        {...register(`ranges.${index}.closes`)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t('admin.reservationSettings.hours.removeNamed', {
                          day: day(weekday),
                          n,
                        })}
                        onClick={() => remove(index)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  );
                })}
                {dayErrors.length > 0 ? (
                  <p id={errorId} className="text-sm text-destructive">
                    {[...new Set(dayErrors)].map((m) => t(m)).join(' ')}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={t('admin.reservationSettings.hours.addRangeNamed', {
                  day: day(weekday),
                })}
                onClick={() =>
                  append(
                    indexes.length === 0
                      ? { weekday, opens: '12:00', closes: '15:00' }
                      : { weekday, opens: '18:00', closes: '22:00' },
                  )
                }
              >
                <Plus aria-hidden="true" />
                {t('admin.reservationSettings.hours.addRange')}
              </Button>
            </li>
          );
        })}
      </ul>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? t('admin.reservationSettings.saving')
          : t('admin.reservationSettings.hours.save')}
      </Button>
    </form>
  );
}
