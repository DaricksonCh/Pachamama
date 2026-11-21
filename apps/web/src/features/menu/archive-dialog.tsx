import { useTranslation } from 'react-i18next';
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

/** Confirmación de archivado. `error` (clave i18n) se muestra dentro del diálogo, que sigue abierto. */
export function ArchiveDialog({
  open,
  kind,
  name,
  error,
  pending,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  kind: 'category' | 'dish';
  name: string;
  error?: string | null;
  pending?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(`admin.menu.archive.${kind}.title`, { name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(`admin.menu.archive.${kind}.description`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {t(error)}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{t('admin.menu.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              // Sin esto el diálogo se cierra antes de poder mostrar un error del servidor.
              event.preventDefault();
              onConfirm();
            }}
          >
            {t('admin.menu.archive.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
