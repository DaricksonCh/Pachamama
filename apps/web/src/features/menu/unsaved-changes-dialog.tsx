import type { Blocker } from 'react-router';
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

/** Pregunta si se abandona un formulario con cambios sin guardar (bloqueo de `useBlocker`). */
export function UnsavedChangesDialog({ blocker }: { blocker: Blocker }) {
  const { t } = useTranslation();
  return (
    <AlertDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.state === 'blocked') blocker.reset();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('admin.menu.unsaved.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('admin.menu.unsaved.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('admin.menu.unsaved.stay')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (blocker.state === 'blocked') blocker.proceed();
            }}
          >
            {t('admin.menu.unsaved.leave')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
