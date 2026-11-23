import { publicPath } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { Link } from 'react-router';
import { textLinkClass } from '@/components/public/styles';
import { useLang } from '@/components/public/use-lang';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldError, FormErrorSummary } from '@/features/menu/form-error-summary';
import { errorKey } from '@/features/menu/form-errors';

import {
  COMMENT_MAX,
  DETAILS_FIELDS,
  FORM_ID,
  type ClientRequest,
  type DetailsField,
  type DetailsValues,
} from '../details-fields';
const idOf = (field: DetailsField) => `res-${field}`;
const PRIVACY_LABEL_ID = 'res-privacy-label';
const LABEL_KEYS: Record<DetailsField, string> = {
  name: 'reservations.details.name',
  email: 'reservations.details.email',
  phone: 'reservations.details.phone',
  comment: 'reservations.details.comment',
  privacyAccepted: 'reservations.details.privacyShort',
};

interface DetailsStepProps {
  form: UseFormReturn<DetailsValues, unknown, ClientRequest>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  /** Non-field problem of the last submit (rate limit, network…), already translated. */
  submitError: string | undefined;
}

/** Step 4: contact details, comment and privacy consent. The submit button lives in the summary. */
export function DetailsStep({ form, onSubmit, submitError }: DetailsStepProps) {
  const { t } = useTranslation();
  const lang = useLang();
  const {
    register,
    control,
    setFocus,
    watch,
    formState: { errors, submitCount },
  } = form;
  const comment = watch('comment');

  const errorOf = (field: DetailsField) =>
    errorKey((errors as Record<string, { message?: string } | undefined>)[field]?.message);
  const invalid = DETAILS_FIELDS.filter((field) => errorOf(field));
  // Errors on choices of earlier steps (party, date, time, language) have no field here.
  const hiddenError =
    submitCount > 0 &&
    Object.keys(errors).some(
      (key) =>
        !(DETAILS_FIELDS as readonly string[]).includes(key) && key !== 'website' && key !== 'root',
    );

  const a11y = (field: DetailsField, opts: { required?: boolean; hint?: boolean } = {}) => {
    const error = errorOf(field);
    const describedBy = [
      field === 'comment' ? `${idOf(field)}-help` : null,
      opts.hint ? `${idOf(field)}-hint` : null,
      error ? `${idOf(field)}-error` : null,
    ].filter(Boolean);
    return {
      id: idOf(field),
      'aria-required': opts.required ? (true as const) : undefined,
      'aria-invalid': error ? (true as const) : undefined,
      'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined,
    };
  };
  const label = (field: DetailsField, required: boolean) => (
    <Label htmlFor={idOf(field)} className="text-base">
      {t(LABEL_KEYS[field])}
      {required ? (
        <span aria-hidden="true"> *</span>
      ) : (
        <span> ({t('reservations.details.optional')})</span>
      )}
    </Label>
  );
  const inputClass = 'h-11 bg-white';

  return (
    <form id={FORM_ID} onSubmit={onSubmit} noValidate className="space-y-6">
      {submitCount > 0 ? (
        <FormErrorSummary
          attempt={submitCount}
          items={invalid.map((field) => ({
            id: idOf(field),
            label: t(LABEL_KEYS[field]),
            message: errorOf(field) ?? '',
            focus: () =>
              field === 'privacyAccepted'
                ? document.getElementById(idOf(field))?.focus()
                : setFocus(field),
          }))}
        />
      ) : null}
      {submitError || hiddenError ? (
        <p role="alert" className="rounded-md border border-aji/50 bg-white p-4 font-medium">
          {submitError ?? t('reservations.errors.generic')}
        </p>
      ) : null}
      <p className="text-sm text-tierra/80">{t('reservations.details.requiredHint')}</p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          {label('name', true)}
          <Input
            {...a11y('name', { required: true })}
            {...register('name')}
            autoComplete="name"
            className={inputClass}
          />
          <FieldError id={`${idOf('name')}-error`} message={errorOf('name')} />
        </div>
        <div className="space-y-2">
          {label('email', true)}
          <Input
            {...a11y('email', { required: true })}
            {...register('email')}
            type="email"
            autoComplete="email"
            className={inputClass}
          />
          <FieldError id={`${idOf('email')}-error`} message={errorOf('email')} />
        </div>
        <div className="space-y-2">
          {label('phone', true)}
          <Input
            {...a11y('phone', { required: true })}
            {...register('phone')}
            type="tel"
            autoComplete="tel"
            className={inputClass}
          />
          <FieldError id={`${idOf('phone')}-error`} message={errorOf('phone')} />
        </div>
      </div>

      <div className="space-y-2">
        {label('comment', false)}
        <Textarea
          rows={3}
          {...a11y('comment', { hint: true })}
          {...register('comment')}
          className="bg-white"
        />
        <p id={`${idOf('comment')}-help`} className="text-sm text-tierra/80">
          {t('reservations.details.commentHint')}
        </p>
        <p id={`${idOf('comment')}-hint`} className="text-sm text-tierra/80">
          {comment.length}/{COMMENT_MAX}
        </p>
        <FieldError id={`${idOf('comment')}-error`} message={errorOf('comment')} />
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Controller
            control={control}
            name="privacyAccepted"
            render={({ field }) => (
              <Checkbox
                {...a11y('privacyAccepted', { required: true })}
                checked={field.value}
                onCheckedChange={(value) => field.onChange(value === true)}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-labelledby={PRIVACY_LABEL_ID}
                className="mt-1 size-5 border-selva bg-white data-[state=checked]:bg-selva data-[state=checked]:text-papel"
              />
            )}
          />
          <Label
            htmlFor={idOf('privacyAccepted')}
            id={PRIVACY_LABEL_ID}
            className="block text-base leading-relaxed font-normal"
          >
            {t('reservations.details.privacyBefore')}{' '}
            <Link
              to={publicPath('privacy', lang)}
              target="_blank"
              rel="noopener noreferrer"
              className={textLinkClass}
            >
              {t('reservations.details.privacyLink')}
              <span className="sr-only"> {t('reservations.details.newTab')}</span>
            </Link>
            {t('reservations.details.privacyAfter')} <span aria-hidden="true">*</span>
          </Label>
        </div>
        <FieldError id={`${idOf('privacyAccepted')}-error`} message={errorOf('privacyAccepted')} />
      </div>

      {/* Honeypot: real visitors never see or reach it; bots fill it and the API rejects them. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
        </label>
      </div>
    </form>
  );
}
