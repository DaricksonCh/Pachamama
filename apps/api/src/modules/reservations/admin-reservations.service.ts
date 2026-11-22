import {
  DECISION_STATUSES,
  canTransition,
  renderTemplate,
  toUtc,
  type MessageTemplateKind,
  type ReservationStatus,
  type ReservationStatusChange,
} from '@pachamama/shared';
import { withDeadlockRetry } from '../../db/retry-deadlock';
import { AppError } from '../../lib/app-error';
import { logger } from '../../lib/logger';
import type { Mailer } from '../../lib/mailer';
import { buildDecisionEmail, formatDateTime } from './emails';
import type { EmailStatus, ReservationsRepository } from './reservations.repository';
import { addDays, safeErrorCode } from './reservations.service';

type Row = NonNullable<Awaited<ReturnType<ReservationsRepository['getById']>>>;

const isDecision = (s: ReservationStatus): s is MessageTemplateKind & ReservationStatus =>
  (DECISION_STATUSES as readonly string[]).includes(s);

const notFound = () => new AppError(404, 'NOT_FOUND', 'Reservation not found');

function present(r: Row) {
  return {
    id: r.id,
    publicId: r.publicId,
    startsAt: r.startsAt.toISOString(),
    partySize: r.partySize,
    name: r.name,
    phone: r.phone,
    email: r.email,
    comment: r.comment,
    lang: r.lang,
    status: r.status as ReservationStatus,
    decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
  };
}
export type AdminReservation = ReturnType<typeof present>;

function variables(r: Row) {
  const { date, time } = formatDateTime(r.startsAt, r.lang);
  return { name: r.name, date, time, party: r.partySize };
}

const FALLBACK_SUBJECT = {
  de: 'Ihre Reservierung im Pachamama',
  es: 'Su reserva en Pachamama',
} as const;

type DecisionKind = MessageTemplateKind & ReservationStatus;

export function createAdminReservationsService(repo: ReservationsRepository, mailer: Mailer) {
  /** Sends the (already final) decision mail to the guest. Never throws. */
  async function deliver(r: Row, kind: DecisionKind, subject: string, body: string) {
    try {
      const mail = buildDecisionEmail({
        kind,
        lang: r.lang,
        subject,
        body,
        reservation: { startsAt: r.startsAt, partySize: r.partySize, name: r.name },
      });
      await mailer.send({ to: r.email, ...mail });
      return 'sent' as const;
    } catch (err) {
      logger.warn(
        { code: safeErrorCode(err), reservationId: r.id, kind: 'decision-email' },
        'Reservation email failed',
      );
      return 'failed' as const;
    }
  }

  /** The event was stored as 'failed' before sending; flip it once delivery worked. */
  async function markSent(reservationId: number, eventId: number) {
    try {
      await repo.setEventEmailStatus(eventId, 'sent');
    } catch (err) {
      logger.warn(
        { code: safeErrorCode(err), reservationId, kind: 'email-status' },
        'Could not record email status',
      );
    }
  }

  return {
    async listDay(date: string, status?: ReservationStatus) {
      const rows = await repo.listByStartRange(
        toUtc(date, '00:00'),
        toUtc(addDays(date, 1), '00:00'),
        status,
      );
      const failed = await repo.idsWithFailedLastEmail(rows.map((r) => r.id));
      return rows.map((r) => ({ ...present(r), lastEmailFailed: failed.has(r.id) }));
    },

    async pendingCount() {
      return { count: await repo.countPendingFrom(new Date()) };
    },

    async get(id: number) {
      const row = await repo.getById(id);
      if (!row) throw notFound();
      const events = await repo.eventsFor(id);
      return {
        ...present(row),
        events: events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
      };
    },

    async messagePreview(id: number, kind: MessageTemplateKind) {
      const row = await repo.getById(id);
      if (!row) throw notFound();
      const template = await repo.getTemplate(kind, row.lang);
      if (!template) throw new AppError(404, 'NOT_FOUND', 'Template not found');
      const vars = variables(row);
      return {
        subject: renderTemplate(template.subject, vars),
        body: renderTemplate(template.body, vars),
        lang: row.lang,
      };
    },

    async changeStatus(id: number, input: ReservationStatusChange, actorId: string) {
      const { status, message, subject } = input;
      const notify = input.notify ?? true;
      const decision = isDecision(status);
      if ((!decision || !notify) && (message !== undefined || subject !== undefined)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', {
          message: ['validation.notDecision'],
        });
      }
      const send = decision && notify;

      const result = await withDeadlockRetry(() =>
        repo.transaction(async (tx) => {
          const locked = await tx.lockById(id);
          if (!locked) throw notFound();
          if (!canTransition(locked.status as ReservationStatus, status)) {
            throw new AppError(409, 'INVALID_TRANSITION', 'Status change not allowed');
          }
          // Staff text is final (the preview already filled the variables); else the template.
          let finalSubject: string | null = null;
          let finalBody: string | null = null;
          if (send) {
            finalSubject = subject ?? null;
            finalBody = message ?? null;
            if (finalSubject === null || finalBody === null) {
              const template = await tx.getTemplate(status, locked.lang);
              const vars = variables(locked);
              finalSubject ??= template
                ? renderTemplate(template.subject, vars)
                : message !== undefined
                  ? FALLBACK_SUBJECT[locked.lang]
                  : null;
              finalBody ??= template ? renderTemplate(template.body, vars) : null;
            }
          }
          await tx.applyStatus(id, status, decision ? actorId : null);
          const eventId = await tx.insertEvent({
            reservationId: id,
            fromStatus: locked.status as ReservationStatus,
            toStatus: status,
            actorId,
            message: finalBody,
            subject: finalSubject,
            // Pessimistic: a crash before the mail leaves 'failed', never null.
            emailStatus: send ? 'failed' : decision ? 'skipped' : null,
          });
          return { row: { ...locked, status } as Row, eventId, finalSubject, finalBody };
        }),
      );

      let emailStatus: EmailStatus | null = decision && !notify ? 'skipped' : null;
      if (send) {
        const { finalSubject, finalBody } = result;
        emailStatus =
          finalSubject !== null && finalBody !== null
            ? await deliver(result.row, status, finalSubject, finalBody)
            : 'failed';
        if (emailStatus === 'sent') await markSent(id, result.eventId);
        else logger.warn({ reservationId: id, kind: 'decision-email' }, 'Decision email not sent');
      }
      const fresh = (await repo.getById(id)) ?? result.row;
      return { reservation: present(fresh), emailStatus };
    },

    async resendEmail(id: number, actorId: string) {
      const prepared = await withDeadlockRetry(() =>
        repo.transaction(async (tx) => {
          const row = await tx.lockById(id);
          if (!row) throw notFound();
          const last = await tx.latestDecisionEvent(id);
          if (!last || last.message === null || last.toStatus !== row.status) {
            throw new AppError(409, 'NOTHING_TO_RESEND', 'No decision email to resend');
          }
          const status = row.status as DecisionKind;
          // Old events (before the subject column) fall back to the template subject.
          let subject = last.subject;
          if (subject === null) {
            const template = await tx.getTemplate(status, row.lang);
            subject = template
              ? renderTemplate(template.subject, variables(row))
              : FALLBACK_SUBJECT[row.lang];
          }
          const eventId = await tx.insertEvent({
            reservationId: id,
            fromStatus: status,
            toStatus: status,
            actorId,
            message: null,
            subject: null,
            emailStatus: 'failed',
          });
          return { row, status, subject, message: last.message, eventId };
        }),
      );
      const emailStatus = await deliver(
        prepared.row,
        prepared.status,
        prepared.subject,
        prepared.message,
      );
      if (emailStatus === 'sent') await markSent(id, prepared.eventId);
      return { reservation: present(prepared.row), emailStatus };
    },
  };
}
export type AdminReservationsService = ReturnType<typeof createAdminReservationsService>;
