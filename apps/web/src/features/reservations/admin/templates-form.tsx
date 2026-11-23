import { zodResolver } from '@hookform/resolvers/zod';
import {
  MESSAGE_TEMPLATE_KINDS,
  type MessageTemplateKind,
  renderTemplate,
} from '@pachamama/shared';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/features/menu/form-error-summary';
import { applyServerErrors, errorKey } from '@/features/menu/form-errors';
import { ApiError } from '@/lib/api';
import { type StoredTemplate, useSaveTemplate } from './settings-api';

type Lang = 'de' | 'es';
const LANGS: readonly Lang[] = ['de', 'es'];
const VARIABLES = ['name', 'date', 'time', 'party'] as const;
const SUBJECT_MAX = 150;
const BODY_MAX = 4000;

// Misma regla que `messageTemplateInputSchema`, con claves de error traducibles.
const formSchema = z.object({
  subject: z.string().trim().min(1, { error: 'validation.required' }).max(SUBJECT_MAX, {
    error: 'validation.tooLong',
  }),
  body: z.string().trim().min(1, { error: 'validation.required' }).max(BODY_MAX, {
    error: 'validation.tooLong',
  }),
});
type FormValues = z.input<typeof formSchema>;

/** Datos de ejemplo de la vista previa (la fecha sigue el formato del idioma del texto). */
const SAMPLE: Record<Lang, { name: string; date: string; time: string; party: number }> = {
  es: { name: 'Ana García', date: 'sáb., 28 nov. 2026', time: '20:00', party: 4 },
  de: { name: 'Ana García', date: 'Sa., 28. Nov. 2026', time: '20:00', party: 4 },
};

function Counter({ id, count, max }: { id: string; count: number; max: number }) {
  const { t } = useTranslation();
  return (
    <p
      id={id}
      className={count > max ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
    >
      {t('admin.reservationSettings.templates.counter', { count, max })}
    </p>
  );
}

function TemplateForm({
  kind,
  lang,
  template,
  onDirtyChange,
}: {
  kind: MessageTemplateKind;
  lang: Lang;
  template?: StoredTemplate;
  onDirtyChange: (id: string, dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const save = useSaveTemplate();
  const key = `template-${kind}-${lang}`;
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    shouldFocusError: false,
    resolver: zodResolver(formSchema),
    defaultValues: { subject: template?.subject ?? '', body: template?.body ?? '' },
  });
  const [subject = '', body = ''] = useWatch({ control, name: ['subject', 'body'] });

  useEffect(() => {
    onDirtyChange(key, isDirty);
    return () => onDirtyChange(key, false);
  }, [key, isDirty, onDirtyChange]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ kind, lang, ...values });
      reset(values);
      toast.success(t('admin.reservationSettings.templates.saved'));
    } catch (err) {
      if (applyServerErrors(err, ['subject', 'body'], setError)) return;
      toast.error(
        t(
          err instanceof ApiError && err.status === 403
            ? 'admin.reservationSettings.forbidden'
            : 'admin.reservationSettings.saveFailed',
        ),
      );
    }
  });

  const tt = (k: string, opts: Record<string, string> = {}) =>
    t(`admin.reservationSettings.templates.${k}`, opts);
  const subjectError = errorKey(errors.subject?.message);
  const bodyError = errorKey(errors.body?.message);
  const sample = SAMPLE[lang];
  const kindLabel = tt(`kinds.${kind}`);
  const langLabel = tt(`languages.${lang}`);

  return (
    <fieldset className="space-y-3 rounded-md border p-4">
      <legend className="px-1 font-medium">{langLabel}</legend>
      <form onSubmit={onSubmit} noValidate className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`${key}-subject`}>{tt('subject')}</Label>
          <Input
            id={`${key}-subject`}
            aria-invalid={subjectError ? true : undefined}
            aria-describedby={`${key}-subject-count${subjectError ? ` ${key}-subject-error` : ''}`}
            {...register('subject')}
          />
          <Counter id={`${key}-subject-count`} count={subject.length} max={SUBJECT_MAX} />
          <FieldError id={`${key}-subject-error`} message={subjectError} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${key}-body`}>{tt('body')}</Label>
          <Textarea
            id={`${key}-body`}
            rows={8}
            aria-invalid={bodyError ? true : undefined}
            aria-describedby={`${key}-body-count${bodyError ? ` ${key}-body-error` : ''}`}
            {...register('body')}
          />
          <Counter id={`${key}-body-count`} count={body.length} max={BODY_MAX} />
          <FieldError id={`${key}-body-error`} message={bodyError} />
        </div>

        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="font-medium">{tt('preview')}</p>
          <p className="mt-2">
            <span className="font-medium">{tt('previewSubject')} </span>
            <span>{renderTemplate(subject, sample)}</span>
          </p>
          <p className="mt-2 whitespace-pre-wrap">{renderTemplate(body, sample)}</p>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          aria-label={
            isSubmitting ? undefined : tt('saveNamed', { kind: kindLabel, lang: langLabel })
          }
        >
          {isSubmitting ? t('admin.reservationSettings.saving') : tt('save')}
        </Button>
      </form>
    </fieldset>
  );
}

/** Los 4 textos de correo (de/es), cada uno en una sección desplegable y con guardado propio. */
export function TemplatesForm({
  templates,
  onDirtyChange,
}: {
  templates: StoredTemplate[];
  onDirtyChange: (id: string, dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const tt = (k: string) => t(`admin.reservationSettings.templates.${k}`);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold">{tt('title')}</h2>
        <p className="text-sm text-muted-foreground">{tt('intro')}</p>
      </div>
      <p className="rounded-md border bg-muted/50 p-3 text-sm">{tt('receivedNote')}</p>

      <section aria-labelledby="template-variables-title" className="space-y-2">
        <h3 id="template-variables-title" className="font-medium">
          {tt('variablesTitle')}
        </h3>
        <p className="text-sm text-muted-foreground">{tt('variablesHint')}</p>
        <ul aria-labelledby="template-variables-title" className="space-y-1 text-sm">
          {VARIABLES.map((name) => (
            <li key={name}>
              <code className="rounded bg-muted px-1.5 py-0.5">{`{${name}}`}</code>
              {' — '}
              {tt(`variables.${name}`)}
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-3">
        {MESSAGE_TEMPLATE_KINDS.map((kind, index) => (
          <details key={kind} open={index === 0} className="rounded-md border">
            <summary className="cursor-pointer rounded-md p-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">
              {tt(`kinds.${kind}`)}
            </summary>
            <div className="space-y-4 p-3 pt-0">
              {LANGS.map((lang) => (
                <TemplateForm
                  key={lang}
                  kind={kind}
                  lang={lang}
                  template={templates.find((x) => x.kind === kind && x.lang === lang)}
                  onDirtyChange={onDirtyChange}
                />
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
