import { zodResolver } from '@hookform/resolvers/zod';
import { closureSchema } from '@pachamama/shared';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { z } from 'zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError, FormErrorSummary } from '@/features/menu/form-error-summary';
import { applyServerErrors, errorKey } from '@/features/menu/form-errors';
import { ApiError } from '@/lib/api';
import { type StoredClosure, useCreateClosure, useDeleteClosure } from './settings-api';

type FormInput = z.input<typeof closureSchema>;
type FieldName = 'from' | 'to' | 'reasonDe' | 'reasonEs';
const FIELDS: readonly FieldName[] = ['from', 'to', 'reasonDe', 'reasonEs'];
const LABEL_KEYS: Record<FieldName, string> = {
  from: 'admin.reservationSettings.closures.from',
  to: 'admin.reservationSettings.closures.to',
  reasonDe: 'admin.reservationSettings.closures.reasonDe',
  reasonEs: 'admin.reservationSettings.closures.reasonEs',
};

function formatDay(iso: string, lang: string) {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(lang, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function ClosureForm() {
  const { t } = useTranslation();
  const create = useCreateClosure();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<FormInput>({
    shouldFocusError: false,
    resolver: zodResolver(closureSchema),
    defaultValues: { from: '', to: '', reasonDe: '', reasonEs: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    // Los motivos vacíos no se envían.
    const body = {
      from: values.from,
      to: values.to,
      ...(values.reasonDe ? { reasonDe: values.reasonDe } : {}),
      ...(values.reasonEs ? { reasonEs: values.reasonEs } : {}),
    };
    try {
      await create.mutateAsync(body);
      reset();
      toast.success(t('admin.reservationSettings.closures.added'));
    } catch (err) {
      if (applyServerErrors(err, FIELDS, setError)) return;
      toast.error(
        t(
          err instanceof ApiError && err.status === 403
            ? 'admin.reservationSettings.forbidden'
            : 'admin.reservationSettings.saveFailed',
        ),
      );
    }
  });

  const invalid = FIELDS.filter((f) => errors[f]?.message);
  const field = (name: FieldName, type: 'date' | 'text') => {
    const error = errorKey(errors[name]?.message);
    const required = name === 'from' || name === 'to';
    return (
      <div className="space-y-2">
        <Label htmlFor={`closure-${name}`}>
          {t(LABEL_KEYS[name])}
          {required ? <span aria-hidden="true"> *</span> : null}
        </Label>
        <Input
          id={`closure-${name}`}
          type={type}
          aria-required={required ? true : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `closure-${name}-error` : undefined}
          {...register(name)}
        />
        <FieldError id={`closure-${name}-error`} message={error} />
      </div>
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-4">
      <h3 className="font-display text-lg font-semibold">
        {t('admin.reservationSettings.closures.newTitle')}
      </h3>
      {submitCount > 0 ? (
        <FormErrorSummary
          attempt={submitCount}
          items={invalid.map((name) => ({
            id: `closure-${name}`,
            label: t(LABEL_KEYS[name]),
            message: errorKey(errors[name]?.message) ?? '',
            focus: () => setFocus(name),
          }))}
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {field('from', 'date')}
        {field('to', 'date')}
        {field('reasonDe', 'text')}
        {field('reasonEs', 'text')}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? t('admin.reservationSettings.saving')
          : t('admin.reservationSettings.closures.add')}
      </Button>
    </form>
  );
}

/** Cierres próximos con borrado confirmado + formulario para añadir uno. */
export function ClosuresList({ closures }: { closures: StoredClosure[] }) {
  const { t, i18n } = useTranslation();
  const remove = useDeleteClosure();
  const [target, setTarget] = useState<StoredClosure | null>(null);

  const reasonOf = (c: StoredClosure) =>
    (i18n.language === 'es' ? c.reasonEs || c.reasonDe : c.reasonDe || c.reasonEs) ||
    t('admin.reservationSettings.closures.noReason');
  const range = (c: StoredClosure) => ({
    from: formatDay(c.from, i18n.language),
    to: formatDay(c.to, i18n.language),
  });

  const confirmDelete = async () => {
    if (!target) return;
    try {
      await remove.mutateAsync(target.id);
      toast.success(t('admin.reservationSettings.closures.deleted'));
    } catch {
      toast.error(t('admin.reservationSettings.closures.deleteFailed'));
    } finally {
      setTarget(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <h2 className="font-display text-xl font-semibold">
            {t('admin.reservationSettings.closures.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('admin.reservationSettings.closures.intro')}
          </p>
        </div>
        {closures.length === 0 ? (
          <p className="text-muted-foreground">{t('admin.reservationSettings.closures.empty')}</p>
        ) : (
          <ul className="max-w-2xl divide-y rounded-md border">
            {closures.map((closure) => (
              <li key={closure.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="font-medium">
                    {t('admin.reservationSettings.closures.period', range(closure))}
                  </p>
                  <p className="text-sm text-muted-foreground">{reasonOf(closure)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('admin.reservationSettings.closures.deleteNamed', range(closure))}
                  onClick={() => setTarget(closure)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ClosureForm />

      <AlertDialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('admin.reservationSettings.closures.confirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target
                ? t('admin.reservationSettings.closures.confirmDescription', range(target))
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.reservationSettings.closures.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {t('admin.reservationSettings.closures.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
