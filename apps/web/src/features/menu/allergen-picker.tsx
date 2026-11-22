import { ALLERGEN_CODES, ALLERGENS } from '@pachamama/shared';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FieldError } from './form-error-summary';

/** Los 14 alérgenos (letra y nombre) como casillas; react-hook-form recoge las marcadas. */
export function AllergenPicker({
  idPrefix,
  inputProps,
  disabled,
  error,
}: {
  idPrefix: string;
  inputProps: UseFormRegisterReturn;
  disabled?: boolean;
  /** Clave i18n del error del grupo. */
  error?: string;
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'es' ? 'es' : 'de';
  return (
    <fieldset
      className="space-y-3"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${idPrefix}-error` : undefined}
    >
      <legend className="text-sm font-medium">{t('admin.menu.dishes.form.allergens')}</legend>
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {ALLERGEN_CODES.map((code) => (
          <div key={code} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`${idPrefix}-${code}`}
              value={code}
              disabled={disabled}
              className="size-4 accent-primary"
              {...inputProps}
            />
            <label htmlFor={`${idPrefix}-${code}`} className="text-sm">
              <span className="font-semibold">{code}</span> {ALLERGENS[code][language]}
            </label>
          </div>
        ))}
      </div>
      <FieldError id={`${idPrefix}-error`} message={error} />
    </fieldset>
  );
}
