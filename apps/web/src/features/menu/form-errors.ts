import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import i18n from '@/i18n';
import { ApiError } from '@/lib/api';

/**
 * Clave i18n de un error de formulario. Los mensajes propios de los schemas son claves
 * `validation.*`; cualquier otro (mensajes por defecto de Zod en inglés, claves sin traducir)
 * se muestra como "valor no válido", nunca como texto sin traducir.
 */
export function errorKey(message: string | undefined): string | undefined {
  if (!message) return undefined;
  return message.startsWith('validation.') && i18n.exists(message) ? message : 'validation.invalid';
}

/**
 * Pasa los errores por campo de un 400 de la API (`details`) al formulario
 * (en el orden de `fields`); el foco lo recibe el resumen de errores del formulario. `aliases` da el nombre de la API de un campo cuando no coincide
 * (p. ej. `imageAltDe` → `altDe`). Devuelve `true` si había alguno de los campos indicados.
 */
export function applyServerErrors<T extends FieldValues>(
  err: unknown,
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
  aliases: Partial<Record<Path<T>, string>> = {},
): boolean {
  if (!(err instanceof ApiError) || !err.details) return false;
  const details = err.details;
  let any = false;
  for (const field of fields) {
    const alias = aliases[field];
    const message = details[field]?.[0] ?? (alias ? details[alias]?.[0] : undefined);
    if (message) {
      setError(field, { message });
      any = true;
    }
  }
  return any;
}
