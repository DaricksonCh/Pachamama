import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { Slot } from '@pachamama/shared';
import { isLunch } from '../dates';
import { optionClass } from '../option-class';
import type { useSlots } from '../use-availability';

interface TimeStepProps {
  query: ReturnType<typeof useSlots>;
  time: string | undefined;
  slotFull: boolean;
  onChange: (time: string) => void;
}

/** Step 3: pick a slot. Slots are restaurant-local `HH:mm` exactly as the API delivers them. */
export function TimeStep({ query, time, slotFull, onChange }: TimeStepProps) {
  const { t } = useTranslation();
  const slots = query.data ?? [];
  const lunch = slots.filter((s) => isLunch(s.time));
  const dinner = slots.filter((s) => !isLunch(s.time));

  return (
    <div className="space-y-6">
      {slotFull ? (
        <p
          role="alert"
          className="rounded-md border border-aji/50 bg-white p-4 font-medium text-tierra"
        >
          {t('reservations.errors.slotFull')}
        </p>
      ) : null}

      {/* Live region: screen readers hear when the slots arrive. */}
      <div aria-live="polite" aria-busy={query.isFetching} className="space-y-6">
        {query.isPending ? (
          <div role="status" className="space-y-3">
            <Skeleton className="h-11 w-full max-w-md" />
            <Skeleton className="h-11 w-full max-w-md" />
            <span className="sr-only">{t('reservations.time.loading')}</span>
          </div>
        ) : null}
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
        {query.isSuccess && slots.length === 0 ? (
          <p className="rounded-md border border-border bg-white p-4 leading-relaxed">
            {t('reservations.time.empty')}
          </p>
        ) : null}
        {query.isSuccess && lunch.length > 0 ? (
          <SlotGroup
            label={t('reservations.time.lunch')}
            slots={lunch}
            time={time}
            onChange={onChange}
          />
        ) : null}
        {query.isSuccess && dinner.length > 0 ? (
          <SlotGroup
            label={t('reservations.time.dinner')}
            slots={dinner}
            time={time}
            onChange={onChange}
          />
        ) : null}
      </div>
    </div>
  );
}

function SlotGroup({
  label,
  slots,
  time,
  onChange,
}: {
  label: string;
  slots: Slot[];
  time: string | undefined;
  onChange: (time: string) => void;
}) {
  const { t } = useTranslation();
  const selected = slots.some((s) => s.time === time && s.available) ? (time ?? '') : '';
  return (
    <section className="space-y-2">
      <h3 aria-hidden="true" className="font-display text-xl text-selva">
        {label}
      </h3>
      <ToggleGroup
        type="single"
        role="radiogroup"
        aria-label={label}
        spacing={2}
        value={selected}
        onValueChange={(value) => {
          if (value) onChange(value);
        }}
        className="flex flex-wrap gap-2"
      >
        {slots.map((slot) => (
          <ToggleGroupItem
            key={slot.time}
            value={slot.time}
            aria-disabled={slot.available ? undefined : true}
            // A full slot stays focusable and readable, but cannot be chosen.
            onClick={slot.available ? undefined : (event) => event.preventDefault()}
            className={cn(
              optionClass('min-w-20 tabular-nums'),
              !slot.available &&
                'cursor-not-allowed border-dashed bg-transparent text-tierra/75 line-through hover:border-selva/70 hover:bg-transparent',
            )}
          >
            {slot.time}
            {slot.available ? null : (
              <span className="sr-only">, {t('reservations.time.full')}</span>
            )}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </section>
  );
}
