import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export interface SummaryItem {
  /** id del control al que lleva el enlace. */
  id: string;
  label: string;
  /** Clave i18n del error (ya pasada por `errorKey`). */
  message: string;
  focus: () => void;
}

/**
 * Resumen de errores al enviar, con enlaces que llevan el foco a cada campo inválido.
 * Al fallar un envío (`attempt` = nº de envíos) el foco pasa al resumen, una vez por intento.
 */
export function FormErrorSummary({ items, attempt }: { items: SummaryItem[]; attempt: number }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const focusedAttempt = useRef(0);
  const hasItems = items.length > 0;
  useEffect(() => {
    if (!hasItems || focusedAttempt.current === attempt) return;
    focusedAttempt.current = attempt;
    ref.current?.focus();
  }, [attempt, hasItems]);
  if (!hasItems) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="rounded-md border border-destructive/40 bg-red-50 p-4 text-sm text-red-900 focus:outline-2 focus:outline-offset-2 focus:outline-ring"
    >
      <p className="font-medium">{t('admin.menu.errors.summary')}</p>
      <ul className="mt-2 list-disc space-y-1 ps-5">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="underline underline-offset-2"
              onClick={(event) => {
                event.preventDefault();
                item.focus();
              }}
            >
              {item.label}
            </a>
            : {t(item.message)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Texto de error bajo un campo (enlazado con `aria-describedby`). */
export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  const { t } = useTranslation();
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {t(message)}
    </p>
  );
}
