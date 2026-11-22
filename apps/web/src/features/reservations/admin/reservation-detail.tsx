import { canTransition, DECISION_STATUSES, type ReservationStatus } from '@pachamama/shared';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CircleAlert, CircleCheck, MailX } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadError, LoadingBlock } from '@/features/menu/load-states';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  type AdminReservationDetail,
  type EmailStatus,
  reservationKeys,
  useChangeStatus,
  useReservation,
  useResendEmail,
} from './api';
import { DecisionDialog, type DecisionStatus } from './decision-dialog';
import { formatDateTime } from './format';
import { ReservationStatusBadge } from './status-badge';

const ACTIONS = ['confirmed', 'rejected', 'cancelled', 'completed', 'no_show'] as const;
type Action = (typeof ACTIONS)[number];
const isDecision = (status: ReservationStatus): status is DecisionStatus =>
  (DECISION_STATUSES as readonly string[]).includes(status);

/** Evento de decisión más reciente: si su correo falló, el personal puede reenviarlo. */
function latestDecisionEmailFailed(reservation: AdminReservationDetail) {
  const decision = reservation.events.filter((e) => isDecision(e.toStatus)).at(-1);
  return decision?.emailStatus === 'failed';
}

export function ReservationDetail({ id }: { id: number | undefined }) {
  const { t } = useTranslation();
  const { data, isPending, isError, error, refetch } = useReservation(id);

  if (id === undefined || (isError && error instanceof ApiError && error.status === 404)) {
    return (
      <div className="space-y-4">
        <p role="alert">{t('admin.reservations.detail.notFound')}</p>
        <BackLink />
      </div>
    );
  }
  if (isPending) return <LoadingBlock rows={['h-10', 'h-40', 'h-40']} />;
  if (isError) return <LoadError onRetry={() => void refetch()} />;
  return <Loaded reservation={data} />;
}

function BackLink() {
  const { t } = useTranslation();
  return (
    <Button asChild variant="outline" size="sm">
      <Link to="/admin/reservations">
        <ArrowLeft aria-hidden="true" />
        {t('admin.reservations.detail.back')}
      </Link>
    </Button>
  );
}

function Loaded({ reservation }: { reservation: AdminReservationDetail }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  // El diálogo sigue montado al cerrarse: así Radix devuelve el foco al botón que lo abrió.
  const [decision, setDecision] = useState<DecisionStatus>('confirmed');
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [simple, setSimple] = useState<'completed' | 'no_show' | null>(null);
  const resend = useResendEmail(reservation.id);
  const simpleChange = useChangeStatus(reservation.id);

  const refetchDetail = () =>
    queryClient.invalidateQueries({ queryKey: reservationKeys.detail(reservation.id) });

  const available = ACTIONS.filter((target) => canTransition(reservation.status, target));

  const open = (action: Action) => {
    if (action === 'completed' || action === 'no_show') setSimple(action);
    else {
      setDecision(action);
      setDecisionOpen(true);
    }
  };

  const doResend = async () => {
    try {
      const status = await resend.mutateAsync();
      if (status === 'failed') toast.warning(t('admin.reservations.resend.failedAgain'));
      else toast.success(t('admin.reservations.resend.sent'));
    } catch (err) {
      toast.error(
        t(
          err instanceof ApiError && err.status === 409
            ? 'admin.reservations.resend.nothing'
            : 'admin.reservations.resend.failed',
        ),
      );
      void refetchDetail();
    }
  };

  const confirmSimple = async () => {
    if (!simple) return;
    try {
      await simpleChange.mutateAsync({ status: simple });
      toast.success(t('admin.reservations.decision.saved'));
    } catch (err) {
      toast.error(
        t(
          err instanceof ApiError && err.status === 409
            ? 'admin.reservations.errors.conflict'
            : 'admin.reservations.errors.saveFailed',
        ),
      );
      void refetchDetail();
    }
    setSimple(null);
  };

  const language = t(`admin.reservations.languages.${reservation.lang}`);

  return (
    <section className="space-y-6">
      <BackLink />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold">
          {t('admin.reservations.detail.title', { name: reservation.name })}
        </h1>
        <ReservationStatusBadge status={reservation.status} />
      </div>

      {latestDecisionEmailFailed(reservation) ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4"
        >
          <p className="flex items-center gap-2 font-medium text-destructive">
            <MailX className="size-5" aria-hidden="true" />
            {t('admin.reservations.resend.banner')}
          </p>
          <Button variant="outline" disabled={resend.isPending} onClick={() => void doResend()}>
            {t('admin.reservations.resend.action')}
          </Button>
        </div>
      ) : null}

      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr]">
        <dt className="font-medium">{t('admin.reservations.detail.when')}</dt>
        <dd>{formatDateTime(reservation.startsAt, i18n.language)}</dd>
        <dt className="font-medium">{t('admin.reservations.detail.party')}</dt>
        <dd>{reservation.partySize}</dd>
        <dt className="font-medium">{t('admin.reservations.detail.phone')}</dt>
        <dd>
          <a className="underline" href={`tel:${reservation.phone.replace(/\s+/g, '')}`}>
            {reservation.phone}
          </a>
        </dd>
        <dt className="font-medium">{t('admin.reservations.detail.email')}</dt>
        <dd>
          <a className="underline" href={`mailto:${reservation.email}`}>
            {reservation.email}
          </a>
        </dd>
        <dt className="font-medium">{t('admin.reservations.detail.language')}</dt>
        <dd>{language}</dd>
        <dt className="font-medium">{t('admin.reservations.detail.comment')}</dt>
        <dd className="break-words whitespace-pre-wrap">
          {reservation.comment ?? (
            <span className="text-muted-foreground">
              {t('admin.reservations.detail.noComment')}
            </span>
          )}
        </dd>
      </dl>

      {available.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t('admin.reservations.detail.actions')}</h2>
          <div className="flex flex-wrap gap-2">
            {available.map((action) => (
              <Button
                key={action}
                variant={action === 'confirmed' ? 'default' : 'outline'}
                onClick={() => open(action)}
              >
                {t(`admin.reservations.actions.${action}`)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <History reservation={reservation} />

      <DecisionDialog
        reservation={reservation}
        status={decision}
        open={decisionOpen}
        onOpenChange={setDecisionOpen}
        onConflict={() => void refetchDetail()}
      />

      <AlertDialog open={simple !== null} onOpenChange={(next) => !next && setSimple(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {simple ? t(`admin.reservations.simple.${simple}.title`) : null}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {simple
                ? t(`admin.reservations.simple.${simple}.description`, {
                    name: reservation.name,
                  })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.reservations.decision.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={simpleChange.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmSimple();
              }}
            >
              {simple ? t(`admin.reservations.actions.${simple}`) : null}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

const EMAIL_STYLES: Record<EmailStatus, string> = {
  sent: 'border-green-700/30 bg-green-50 text-green-900',
  failed: 'border-red-700/30 bg-red-50 text-red-900',
  skipped: 'border-border bg-muted text-muted-foreground',
};

function History({ reservation }: { reservation: AdminReservationDetail }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{t('admin.reservations.history.title')}</h2>
      <ol className="space-y-3">
        {reservation.events.map((event) => (
          <li key={event.id} className="space-y-1 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <time dateTime={event.createdAt} className="text-muted-foreground tabular-nums">
                {formatDateTime(event.createdAt, i18n.language)}
              </time>
              <span className="font-medium">
                {event.actorName ?? t('admin.reservations.history.online')}
              </span>
              <span>
                {event.fromStatus
                  ? t('admin.reservations.history.change', {
                      from: t(`admin.reservations.status.${event.fromStatus}`),
                      to: t(`admin.reservations.status.${event.toStatus}`),
                    })
                  : t('admin.reservations.history.created')}
              </span>
              {event.emailStatus ? (
                <Badge variant="outline" className={cn(EMAIL_STYLES[event.emailStatus])}>
                  {event.emailStatus === 'sent' ? (
                    <CircleCheck aria-hidden="true" />
                  ) : event.emailStatus === 'failed' ? (
                    <CircleAlert aria-hidden="true" />
                  ) : null}
                  {t(`admin.reservations.history.email.${event.emailStatus}`)}
                </Badge>
              ) : null}
            </div>
            {event.message ? (
              <p className="line-clamp-3 text-sm whitespace-pre-wrap text-muted-foreground">
                {event.message}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
