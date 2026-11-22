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
import { useSaveCategory } from './api';
import { FieldError, FormErrorSummary } from './form-error-summary';
import { applyServerErrors, errorKey } from './form-errors';
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
    shouldFocusError: false,
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
      if (applyServerErrors(err, FIELDS, setError)) return;
      toast.error(t('admin.menu.errors.saveFailed'));
    }
  });

  const invalidFields = FIELDS.filter((field) => errors[field]?.message);

  const text = (name: FieldName, labelKey: string, multiline = false) => {
    const error = errorKey(errors[name]?.message);
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
        <FieldError id={`category-${name}-error`} message={error} />
      </div>
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-5">
      {submitCount > 0 ? (
        <FormErrorSummary
          attempt={submitCount}
          items={invalidFields.map((field) => ({
            id: `category-${field}`,
            label: t(LABEL_KEYS[field]),
            message: errorKey(errors[field]?.message) ?? '',
            focus: () => setFocus(field),
          }))}
        />
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
