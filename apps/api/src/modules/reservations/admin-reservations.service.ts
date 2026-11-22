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

export function createAdminReservationsService(repo: ReservationsRepository, mailer: Mailer) {
  /** Sends the decision mail to the guest. Never throws; returns the delivery result. */
  async function deliver(
    r: Row,
    kind: MessageTemplateKind & ReservationStatus,
    subject: string | undefined,
    body: string | null,
  ): Promise<EmailStatus> {
    try {
      let finalSubject = subject;
      let finalBody = body;
      if (finalSubject === undefined || finalBody === null) {
        const template = await repo.getTemplate(kind, r.lang);
        if (!template) {
          logger.warn(
            { reservationId: r.id, kind: 'missing-template', lang: r.lang },
            'Template missing',
          );
          return 'failed';
        }
        finalSubject ??= renderTemplate(template.subject, variables(r));
        finalBody ??= renderTemplate(template.body, variables(r));
      }
      const mail = buildDecisionEmail({
        kind,
        lang: r.lang,
        subject: finalSubject,
        body: finalBody,
        reservation: { startsAt: r.startsAt, partySize: r.partySize, name: r.name },
      });
      await mailer.send({ to: r.email, ...mail });
      return 'sent';
    } catch (err) {
      logger.warn(
        { code: safeErrorCode(err), reservationId: r.id, kind: 'decision-email' },
        'Reservation email failed',
      );
      return 'failed';
    }
  }

  async function recordEmailStatus(reservationId: number, eventId: number, status: EmailStatus) {
    try {
      await repo.setEventEmailStatus(eventId, status);
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
      if (!decision && (message !== undefined || subject !== undefined)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', {
          message: ['validation.notDecision'],
        });
      }
      const send = decision && notify;

      const { row, eventId, sentBody } = await withDeadlockRetry(() =>
        repo.transaction(async (tx) => {
          const locked = await tx.lockById(id);
          if (!locked) throw notFound();
          if (!canTransition(locked.status as ReservationStatus, status)) {
            throw new AppError(409, 'INVALID_TRANSITION', 'Status change not allowed');
          }
          let body: string | null = null;
          if (send) {
            // Staff text is final (the preview already filled the variables); else the template.
            body = message ?? null;
            if (body === null) {
              const template = await tx.getTemplate(status as MessageTemplateKind, locked.lang);
              body = template ? renderTemplate(template.body, variables(locked)) : null;
            }
          }
          await tx.applyStatus(id, status, decision ? actorId : null);
          const eventId = await tx.insertEvent({
            reservationId: id,
            fromStatus: locked.status as ReservationStatus,
            toStatus: status,
            actorId,
            message: body,
            emailStatus: decision && !notify ? 'skipped' : null,
          });
          return { row: { ...locked, status } as Row, eventId, sentBody: body };
        }),
      );

      let emailStatus: EmailStatus | null = decision && !notify ? 'skipped' : null;
      if (send) {
        emailStatus = await deliver(
          row,
          status as MessageTemplateKind & ReservationStatus,
          subject,
          sentBody,
        );
        await recordEmailStatus(id, eventId, emailStatus);
      }
      const fresh = (await repo.getById(id)) ?? row;
      return { reservation: present(fresh), emailStatus };
    },

    async resendEmail(id: number, actorId: string) {
      const row = await repo.getById(id);
      if (!row) throw notFound();
      const last = await repo.latestDecisionEvent(id);
      if (!last || last.message === null || last.toStatus !== row.status) {
        throw new AppError(409, 'NOTHING_TO_RESEND', 'No decision email to resend');
      }
      const status = row.status as MessageTemplateKind & ReservationStatus;
      const emailStatus = await deliver(row, status, undefined, last.message);
      try {
        await repo.insertEvent({
          reservationId: id,
          fromStatus: status,
          toStatus: status,
          actorId,
          message: null,
          emailStatus,
        });
      } catch (err) {
        logger.warn(
          { code: safeErrorCode(err), reservationId: id, kind: 'email-status' },
          'Could not record email status',
        );
      }
      return { reservation: present(row), emailStatus };
    },
  };
}
export type AdminReservationsService = ReturnType<typeof createAdminReservationsService>;
