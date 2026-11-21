import { ImageOff, Trash2, Undo2 } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FieldError } from './form-error-summary';
import { IMAGE_TYPES } from './image-file';

/**
 * Vista previa local de los archivos elegidos (`URL.createObjectURL`). La URL se crea al elegir
 * el archivo y se libera al elegir otro o al desmontar. Solo vale mientras `file` sea ese archivo.
 */
function useFilePreview(file: File | null) {
  const [entry, setEntry] = useState<{ file: File; url: string } | null>(null);
  const latest = useRef(entry);
  useEffect(() => {
    latest.current = entry;
  }, [entry]);
  useEffect(
    () => () => {
      if (latest.current) URL.revokeObjectURL(latest.current.url);
    },
    [],
  );

  const show = (chosen: File) => {
    if (entry) URL.revokeObjectURL(entry.url);
    setEntry({ file: chosen, url: URL.createObjectURL(chosen) });
  };

  return { url: entry && entry.file === file ? entry.url : null, show };
}

/**
 * Foto del plato: elegir/cambiar/quitar con vista previa. Los textos alternativos llegan como
 * `children` (solo se muestran mientras hay foto). `currentUrl`: foto guardada (si la hay).
 */
export function ImageField({
  id,
  currentUrl,
  file,
  removed,
  readOnly,
  error,
  onSelect,
  onRemove,
  onKeep,
  children,
}: {
  id: string;
  currentUrl: string | null;
  file: File | null;
  removed: boolean;
  readOnly?: boolean;
  /** Clave i18n del error de la foto. */
  error?: string;
  /** Devuelve si el archivo se acepta (si no, el formulario ya muestra el error). */
  onSelect: (file: File) => boolean;
  onRemove: () => void;
  onKeep: () => void;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const filePreview = useFilePreview(file);
  const preview = filePreview.url ?? (removed ? null : currentUrl);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{t('admin.menu.dishes.form.photo')}</legend>
      <div className="flex flex-wrap items-start gap-4">
        {preview ? (
          <img
            src={preview}
            alt={t('admin.menu.dishes.form.preview')}
            className="aspect-[4/3] w-40 rounded-md border object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] w-40 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-sm text-muted-foreground">
            <ImageOff className="size-5" aria-hidden="true" />
            {t('admin.menu.dishes.noImage')}
          </div>
        )}
        {readOnly ? null : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <input
                type="file"
                id={id}
                accept={IMAGE_TYPES.join(',')}
                className="peer sr-only"
                aria-describedby={error ? `${hintId} ${errorId}` : hintId}
                aria-invalid={error ? true : undefined}
                onChange={(event) => {
                  const chosen = event.target.files?.[0];
                  // Vaciar el valor permite volver a elegir el mismo archivo tras un error.
                  event.target.value = '';
                  if (chosen && onSelect(chosen)) filePreview.show(chosen);
                }}
              />
              <label
                htmlFor={id}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'cursor-pointer peer-focus-visible:border-ring peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50',
                )}
              >
                {t(
                  preview
                    ? 'admin.menu.dishes.form.changePhoto'
                    : 'admin.menu.dishes.form.choosePhoto',
                )}
              </label>
              {preview ? (
                <Button type="button" variant="outline" size="sm" onClick={onRemove}>
                  <Trash2 aria-hidden="true" />
                  {t('admin.menu.dishes.form.removePhoto')}
                </Button>
              ) : null}
              {removed && !file && currentUrl ? (
                <Button type="button" variant="outline" size="sm" onClick={onKeep}>
                  <Undo2 aria-hidden="true" />
                  {t('admin.menu.dishes.form.keepPhoto')}
                </Button>
              ) : null}
            </div>
            <p id={hintId} className="text-sm text-muted-foreground">
              {t('admin.menu.dishes.form.photoHint')}
            </p>
            {removed && !file && currentUrl ? (
              <p className="text-sm">{t('admin.menu.dishes.form.photoRemoved')}</p>
            ) : null}
            <FieldError id={errorId} message={error} />
          </div>
        )}
      </div>
      {children}
    </fieldset>
  );
}
