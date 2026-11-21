import { zodResolver } from '@hookform/resolvers/zod';
import { type AdminCategory, categoryInputSchema } from '@pachamama/shared';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { useSaveCategory } from './api';
import { UnsavedChangesDialog } from './unsaved-changes-dialog';
import { useUnsavedChanges } from './use-unsaved-changes';

type FormInput = z.input<typeof categoryInputSchema>;
type FormOutput = z.output<typeof categoryInputSchema>;
type FieldName = 'nameDe' | 'nameEs' | 'descriptionDe' | 'descriptionEs';

const FIELDS: readonly FieldName[] = ['nameDe', 'nameEs', 'descriptionDe', 'descriptionEs'];
const LABEL_KEYS: Record<FieldName, string> = {
  nameDe: 'admin.menu.categories.form.nameDe',
  nameEs: 'admin.menu.categories.form.nameEs',
  descriptionDe: 'admin.menu.categories.form.descriptionDe',
  descriptionEs: 'admin.menu.categories.form.descriptionEs',
};

function toDefaults(category?: AdminCategory): FormInput {
  return {
    nameDe: category?.nameDe ?? '',
    nameEs: category?.nameEs ?? '',
    descriptionDe: category?.descriptionDe ?? '',
    descriptionEs: category?.descriptionEs ?? '',
    status: category?.status === 'hidden' ? 'hidden' : 'visible',
  };
}

/** Formulario de categoría (alta y edición). `readOnly`: el personal solo consulta. */
export function CategoryForm({
  category,
  readOnly = false,
  onSaved,
}: {
  category?: AdminCategory;
  readOnly?: boolean;
  onSaved: (saved: AdminCategory) => void;
}) {
  const { t } = useTranslation();
  const save = useSaveCategory();
  const [saved, setSaved] = useState<AdminCategory | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isDirty, isSubmitting, submitCount },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: toDefaults(category),
  });
  const blocker = useUnsavedChanges(isDirty && !saved);

  // Se avisa tras renderizar con `saved`, para que el bloqueo ya no esté activo al navegar.
  useEffect(() => {
    if (saved) onSaved(saved);
  }, [saved, onSaved]);

  const isArchived = category?.status === 'archived';

  const onSubmit = handleSubmit(async (values) => {
    // Una categoría archivada se restaura desde el listado, no desde aquí.
    const data = isArchived ? { ...values, status: undefined } : values;
    try {
      const result = await save.mutateAsync({ id: category?.id, data });
      toast.success(t('admin.menu.categories.saved'));
      setSaved(result);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR' && err.details) {
        let any = false;
        for (const field of FIELDS) {
          const message = err.details[field]?.[0];
          if (message) {
            setError(field, { message }, { shouldFocus: !any });
            any = true;
          }
        }
        if (any) return;
      }
      toast.error(t('admin.menu.errors.saveFailed'));
    }
  });

  const invalidFields = FIELDS.filter((field) => errors[field]?.message);

  const text = (name: FieldName, labelKey: string, multiline = false) => {
    const error = errors[name]?.message;
    const required = name === 'nameDe' || name === 'nameEs';
    const common = {
      id: `category-${name}`,
      disabled: readOnly,
      'aria-required': required ? (true as const) : undefined,
      'aria-invalid': error ? (true as const) : undefined,
      'aria-describedby': error ? `category-${name}-error` : undefined,
      ...register(name),
    };
    return (
      <div className="space-y-2">
        <Label htmlFor={common.id}>
          {t(labelKey)}
          {required && !readOnly ? <span aria-hidden="true"> *</span> : null}
        </Label>
        {multiline ? <Textarea rows={3} {...common} /> : <Input {...common} />}
        {error ? (
          <p id={`category-${name}-error`} className="text-sm text-destructive">
            {t(error)}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-5">
      {submitCount > 0 && invalidFields.length > 0 ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-red-50 p-4 text-sm text-red-900"
        >
          <p className="font-medium">{t('admin.menu.errors.summary')}</p>
          <ul className="mt-2 list-disc space-y-1 ps-5">
            {invalidFields.map((field) => (
              <li key={field}>
                <a
                  href={`#category-${field}`}
                  className="underline underline-offset-2"
                  onClick={(event) => {
                    event.preventDefault();
                    setFocus(field);
                  }}
                >
                  {t(LABEL_KEYS[field])}
                </a>
                : {t(errors[field]?.message ?? '')}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {text('nameDe', LABEL_KEYS.nameDe)}
      {text('nameEs', LABEL_KEYS.nameEs)}
      {text('descriptionDe', LABEL_KEYS.descriptionDe, true)}
      {text('descriptionEs', LABEL_KEYS.descriptionEs, true)}

      {isArchived ? null : (
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch
                id="category-status"
                disabled={readOnly}
                checked={field.value === 'visible'}
                onCheckedChange={(on) => field.onChange(on ? 'visible' : 'hidden')}
              />
              <Label htmlFor="category-status">{t('admin.menu.categories.form.visible')}</Label>
            </div>
          )}
        />
      )}

      {readOnly ? null : (
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('admin.menu.saving') : t('admin.menu.save')}
        </Button>
      )}
      <UnsavedChangesDialog blocker={blocker} />
    </form>
  );
}
