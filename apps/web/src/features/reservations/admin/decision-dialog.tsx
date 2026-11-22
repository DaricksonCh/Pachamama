import type { DECISION_STATUSES, Language } from '@pachamama/shared';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { type MessagePreview, useChangeStatus, useMessagePreview } from './api';

export type DecisionStatus = (typeof DECISION_STATUSES)[number];

const MAX_SUBJECT = 150;
const MAX_BODY = 2000;

interface DecisionDialogProps {
  reservation: { id: number; name: string; lang: Language };
  status: DecisionStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama tras guardar con éxito, justo antes de cerrar. */
  onDone?: () => void;
  /** Se llama si el servidor rechaza la transición (409): la ficha debe recargarse. */
  onConflict?: () => void;
}

/**
 * Confirmar, rechazar o cancelar una reserva con el correo al cliente. El texto
 * predeterminado viene del servidor (en el idioma del cliente) y el personal puede
 * cambiarlo o añadir algo antes de enviar.
 */
export function DecisionDialog({
  reservation,
  status,
  open,
  onOpenChange,
  onDone,
  onConflict,
}: DecisionDialogProps) {
  const { t } = useTranslation();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const requestClose = (next: boolean) => {
    if (next) return onOpenChange(true);
    if (busy) return;
    if (dirty) return setConfirmDiscard(true);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t(`admin.reservations.decision.${status}.title`)}</DialogTitle>
            <DialogDescription>
              {t('admin.reservations.decision.description', { name: reservation.name })}
            </DialogDescription>
          </DialogHeader>
          <DecisionBody
            reservation={reservation}
            status={status}
            onDirtyChange={setDirty}
            onBusyChange={setBusy}
            onCancel={() => requestClose(false)}
            onDone={() => {
              onDone?.();
              onOpenChange(false);
            }}
            onConflict={() => {
              onConflict?.();
              onOpenChange(false);
            }}
          />
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.reservations.decision.discard.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.reservations.decision.discard.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.reservations.decision.discard.stay')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                setDirty(false);
                onOpenChange(false);
              }}
            >
              {t('admin.reservations.decision.discard.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface BodyProps {
  reservation: DecisionDialogProps['reservation'];
  status: DecisionStatus;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
  onCancel: () => void;
  onDone: () => void;
  onConflict: () => void;
}

/** Carga el texto predeterminado; el formulario solo se monta cuando ya está disponible. */
function DecisionBody(props: BodyProps) {
  const { t } = useTranslation();
  const preview = useMessagePreview(props.reservation.id, props.status);

  if (preview.isPending) {
    return (
      <div role="status" aria-busy="true" className="py-8 text-center text-muted-foreground">
        {t('admin.reservations.decision.loading')}
      </div>
    );
  }
  if (preview.isError) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-destructive">
          {t('admin.reservations.decision.previewFailed')}
        </p>
        <Button variant="outline" onClick={() => void preview.refetch()}>
          {t('admin.retry')}
        </Button>
      </div>
    );
  }
  return <DecisionForm {...props} preview={preview.data} />;
}

function DecisionForm({
  reservation,
  status,
  preview,
  onDirtyChange,
  onBusyChange,
  onCancel,
  onDone,
  onConflict,
}: BodyProps & { preview: MessagePreview }) {
  const { t } = useTranslation();
  const ids = useId();
  const [notify, setNotify] = useState(true);
  const [subject, setSubject] = useState(preview.subject);
  const [message, setMessage] = useState(preview.body);
  const [error, setError] = useState<string | null>(null);
  const change = useChangeStatus(reservation.id);

  const edited = subject !== preview.subject || message !== preview.body;
  useDirtyReport(edited, onDirtyChange);

  const emptyField = notify && (subject.trim() === '' || message.trim() === '');
  const remaining = MAX_BODY - message.length;
  const languageName = t(`admin.reservations.languages.${preview.lang}`);

  const restore = () => {
    setSubject(preview.subject);
    setMessage(preview.body);
  };

  const submit = async () => {
    setError(null);
    onBusyChange(true);
    try {
      const emailStatus = await change.mutateAsync(
        notify
          ? {
              status,
              notify: true,
              // Sin cambios no se envía nada: el servidor usa la misma plantilla.
              ...(message !== preview.body ? { message } : {}),
              ...(subject !== preview.subject ? { subject } : {}),
            }
          : { status, notify: false },
      );
      if (emailStatus === 'failed') {
        toast.warning(t('admin.reservations.decision.savedEmailFailed'));
      } else {
        toast.success(
          t(
            emailStatus === 'sent'
              ? 'admin.reservations.decision.savedSent'
              : 'admin.reservations.decision.saved',
          ),
        );
      }
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(t('admin.reservations.errors.conflict'));
        onConflict();
        return;
      }
      setError(t('admin.reservations.errors.saveFailed'));
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!emptyField && !change.isPending) void submit();
      }}
    >
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${ids}-notify`}
          checked={notify}
          onCheckedChange={(value) => setNotify(value === true)}
        />
        <Label htmlFor={`${ids}-notify`}>{t('admin.reservations.decision.notify')}</Label>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('admin.reservations.decision.language', { language: languageName })}
      </p>

      <fieldset
        disabled={!notify}
        className={cn('space-y-4 border-0 p-0 transition-opacity', !notify && 'opacity-50')}
      >
        <div className="space-y-2">
          <Label htmlFor={`${ids}-subject`}>{t('admin.reservations.decision.subject')}</Label>
          <Input
            id={`${ids}-subject`}
            value={subject}
            maxLength={MAX_SUBJECT}
            onChange={(event) => setSubject(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${ids}-body`}>{t('admin.reservations.decision.body')}</Label>
          <Textarea
            id={`${ids}-body`}
            rows={9}
            value={message}
            maxLength={MAX_BODY}
            aria-describedby={`${ids}-counter`}
            onChange={(event) => setMessage(event.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p id={`${ids}-counter`} className="text-sm text-muted-foreground tabular-nums">
              {t('admin.reservations.decision.counter', { count: message.length, max: MAX_BODY })}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={restore} disabled={!edited}>
              {t('admin.reservations.decision.restore')}
            </Button>
          </div>
          <p role="status" className="sr-only">
            {remaining <= 100
              ? t('admin.reservations.decision.remaining', { count: remaining })
              : ''}
          </p>
          {emptyField ? (
            <p role="alert" className="text-sm text-destructive">
              {t('admin.reservations.decision.required')}
            </p>
          ) : null}
        </div>
      </fieldset>

      <section
        aria-labelledby={`${ids}-preview`}
        className="space-y-2 rounded-md border bg-muted/40 p-3"
      >
        <h3 id={`${ids}-preview`} className="text-sm font-semibold">
          {t('admin.reservations.decision.preview')}
        </h3>
        {notify ? (
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">{t('admin.reservations.decision.subject')}: </span>
              {subject}
            </p>
            <pre className="font-sans break-words whitespace-pre-wrap">{message}</pre>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('admin.reservations.decision.noEmail')}
          </p>
        )}
      </section>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={change.isPending}>
          {t('admin.reservations.decision.cancel')}
        </Button>
        <Button type="submit" disabled={emptyField || change.isPending}>
          {t(
            notify
              ? `admin.reservations.decision.${status}.submit`
              : `admin.reservations.decision.${status}.submitNoMail`,
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Avisa al diálogo de si hay cambios sin enviar; al desmontarse los da por descartados. */
function useDirtyReport(dirty: boolean, report: (dirty: boolean) => void) {
  useEffect(() => {
    report(dirty);
    return () => report(false);
  }, [dirty, report]);
}
