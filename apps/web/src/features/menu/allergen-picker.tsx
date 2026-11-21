import { ALLERGEN_CODES, ALLERGENS } from '@pachamama/shared';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/** Los 14 alérgenos (letra y nombre) como casillas; react-hook-form recoge las marcadas. */
export function AllergenPicker({
  idPrefix,
  inputProps,
  disabled,
}: {
  idPrefix: string;
  inputProps: UseFormRegisterReturn;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'es' ? 'es' : 'de';
  return (
    <fieldset className="space-y-3">
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
    </fieldset>
  );
}
