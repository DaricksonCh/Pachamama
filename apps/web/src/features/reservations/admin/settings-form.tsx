import { zodResolver } from '@hookform/resolvers/zod';
import { type ReservationSettings, reservationSettingsSchema } from '@pachamama/shared';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FieldError, FormErrorSummary } from '@/features/menu/form-error-summary';
import { applyServerErrors, errorKey } from '@/features/menu/form-errors';
import { ApiError } from '@/lib/api';
import { useSaveSettings } from './settings-api';

type NumberField =
  | 'lastSlotBeforeCloseMinutes'
  | 'partyMin'
  | 'partyMax'
  | 'capacityPerSlot'
  | 'minLeadMinutes'
  | 'maxAdvanceDays';

const NUMBER_FIELDS: { name: NumberField; label: string; help?: string; max: number }[] = [
  {
    name: 'lastSlotBeforeCloseMinutes',
    label: 'lastSlot',
    help: 'lastSlotHelp',
    max: 240,
  },
  { name: 'partyMin', label: 'partyMin', help: 'partyHelp', max: 100 },
  { name: 'partyMax', label: 'partyMax', max: 100 },
  { name: 'capacityPerSlot', label: 'capacity', help: 'capacityHelp', max: 1000 },
  { name: 'minLeadMinutes', label: 'minLead', help: 'minLeadHelp', max: 10080 },
  { name: 'maxAdvanceDays', label: 'maxAdvance', help: 'maxAdvanceHelp', max: 365 },
];
const ALL_FIELDS = [...NUMBER_FIELDS.map((f) => f.name), 'sameDayOnline'] as const;

/** Reglas de reserva (PATCH). `slotMinutes` es fijo: se muestra pero no se envía. */
export function SettingsForm({
  settings,
  onDirtyChange,
}: {
  settings: ReservationSettings;
  onDirtyChange: (id: string, dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const save = useSaveSettings();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isDirty, isSubmitting, submitCount },
  } = useForm<ReservationSettings>({
    shouldFocusError: false,
    resolver: zodResolver(reservationSettingsSchema),
    defaultValues: settings,
  });

  useEffect(() => {
    onDirtyChange('settings', isDirty);
    return () => onDirtyChange('settings', false);
  }, [isDirty, onDirtyChange]);

  const onSubmit = handleSubmit(async (values) => {
    const { slotMinutes: _fixed, ...patch } = values;
    try {
      await save.mutateAsync(patch);
      reset(values);
      toast.success(t('admin.reservationSettings.settings.saved'));
    } catch (err) {
      if (applyServerErrors(err, ALL_FIELDS, setError)) return;
      toast.error(
        t(
          err instanceof ApiError && err.status === 403
            ? 'admin.reservationSettings.forbidden'
            : 'admin.reservationSettings.saveFailed',
        ),
      );
    }
  });

  const s = (key: string) => t(`admin.reservationSettings.settings.${key}`);
  const invalid = NUMBER_FIELDS.filter((f) => errors[f.name]?.message);

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold">{s('title')}</h2>
        <p className="text-sm text-muted-foreground">{s('intro')}</p>
      </div>
      {submitCount > 0 ? (
        <FormErrorSummary
          attempt={submitCount}
          items={invalid.map((f) => ({
            id: `settings-${f.name}`,
            label: s(f.label),
            message: errorKey(errors[f.name]?.message) ?? '',
            focus: () => setFocus(f.name),
          }))}
        />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="settings-slotMinutes">{s('slotMinutes')}</Label>
        <Input
          id="settings-slotMinutes"
          value={s('slotMinutesValue')}
          readOnly
          aria-describedby="settings-slotMinutes-help"
        />
        <p id="settings-slotMinutes-help" className="text-sm text-muted-foreground">
          {s('slotMinutesHelp')}
        </p>
      </div>

      {NUMBER_FIELDS.map((f) => {
        const error = errorKey(errors[f.name]?.message);
        const describedBy = [
          f.help ? `settings-${f.name}-help` : null,
          error ? `settings-${f.name}-error` : null,
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div key={f.name} className="space-y-2">
            <Label htmlFor={`settings-${f.name}`}>{s(f.label)}</Label>
            <Input
              id={`settings-${f.name}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={f.max}
              step={1}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy || undefined}
              {...register(f.name, { valueAsNumber: true })}
            />
            {f.help ? (
              <p id={`settings-${f.name}-help`} className="text-sm text-muted-foreground">
                {s(f.help)}
              </p>
            ) : null}
            <FieldError id={`settings-${f.name}-error`} message={error} />
          </div>
        );
      })}

      <Controller
        control={control}
        name="sameDayOnline"
        render={({ field }) => (
          <div className="flex items-center gap-3">
            <Switch
              id="settings-sameDayOnline"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            <Label htmlFor="settings-sameDayOnline">{s('sameDay')}</Label>
          </div>
        )}
      />

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('admin.reservationSettings.saving') : s('save')}
      </Button>
    </form>
  );
}
