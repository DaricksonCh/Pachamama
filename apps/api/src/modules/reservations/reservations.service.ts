import {
  addDays,
  availableDays,
  buildDaySlots,
  renderTemplate,
  toUtc,
  type ReservationRequest,
  type Slot,
} from '@pachamama/shared';
import { withDeadlockRetry } from '../../db/retry-deadlock';
import { AppError } from '../../lib/app-error';
import { logger } from '../../lib/logger';
import type { Mailer } from '../../lib/mailer';
import { safeErrorCode } from '../../lib/safe-error-code';
import { buildDecisionEmail, buildStaffNotification, formatDateTime } from './emails';
import type { EmailStatus, ReservationsRepository } from './reservations.repository';
import type { SettingsService } from './settings.service';

export type CreatedReservation = {
  publicId: string;
  startsAt: string;
  partySize: number;
  status: 'pending';
};

type MailOptions = { notifyEmail: string; webOrigin: string };

export function createReservationsService(
  repo: ReservationsRepository,
  settingsService: SettingsService,
  mailer: Mailer,
  { notifyEmail, webOrigin }: MailOptions,
) {
  function assertPartySize(partySize: number, min: number, max: number, field: string) {
    if (partySize < min || partySize > max) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', {
        [field]: ['validation.partySizeRange'],
      });
    }
  }

  async function daySlots(date: string, partySize: number): Promise<Slot[]> {
    const { hours, closures, settings } = await settingsService.getBookingContext();
    const bookedByStart = await repo.bookedByStart(
      toUtc(date, '00:00'),
      toUtc(addDays(date, 1), '00:00'),
    );
    return buildDaySlots({
      now: new Date(),
      hours,
      closures,
      settings,
      date,
      bookedByStart,
      partySize,
    });
  }

  /** Customer "received" mail + staff notice, after commit. Never throws. */
  async function sendMails(
    reservation: ReservationRequest & { id: number; publicId: string; startsAt: Date },
  ): Promise<EmailStatus> {
    const { id, publicId, startsAt, lang } = reservation;
    let customerStatus: EmailStatus = 'skipped';
    try {
      const template = await repo.getTemplate('received', lang);
      if (template) {
        const { date, time } = formatDateTime(startsAt, lang);
        const vars = { name: reservation.name, date, time, party: reservation.partySize };
        const mail = buildDecisionEmail({
          kind: 'received',
          lang,
          subject: renderTemplate(template.subject, vars),
          body: renderTemplate(template.body, vars),
          reservation: { startsAt, partySize: reservation.partySize, name: reservation.name },
        });
        await mailer.send({ to: reservation.email, ...mail });
        customerStatus = 'sent';
      } else {
        logger.warn(
          { reservationId: id, kind: 'missing-template', lang },
          'Received template missing',
        );
      }
    } catch (err) {
      customerStatus = 'failed';
      logger.warn(
        { code: safeErrorCode(err), reservationId: id, kind: 'customer-email' },
        'Reservation email failed',
      );
    }
    try {
      const mail = buildStaffNotification(
        {
          id,
          publicId,
          startsAt,
          partySize: reservation.partySize,
          name: reservation.name,
          phone: reservation.phone,
          comment: reservation.comment ?? null,
        },
        webOrigin,
      );
      await mailer.send({ to: notifyEmail, ...mail });
    } catch (err) {
      logger.warn(
        { code: safeErrorCode(err), reservationId: id, kind: 'staff-notice' },
        'Reservation email failed',
      );
    }
    return customerStatus;
  }

  return {
    async availableDays(month: string) {
      const { hours, closures, settings } = await settingsService.getBookingContext();
      return {
        days: availableDays({ now: new Date(), hours, closures, settings, month }),
        partyMin: settings.partyMin,
        partyMax: settings.partyMax,
        sameDayOnline: settings.sameDayOnline,
      };
    },

    async slotsFor(date: string, party: number) {
      const { settings } = await settingsService.getBookingContext();
      assertPartySize(party, settings.partyMin, settings.partyMax, 'party');
      return { slots: await daySlots(date, party) };
    },

    async create(input: ReservationRequest): Promise<CreatedReservation> {
      const { settings } = await settingsService.getBookingContext();
      assertPartySize(input.partySize, settings.partyMin, settings.partyMax, 'partySize');

      const slot = (await daySlots(input.date, input.partySize)).find((s) => s.time === input.time);
      if (!slot) throw new AppError(400, 'SLOT_UNAVAILABLE', 'Time slot not available');
      if (!slot.available) throw new AppError(409, 'SLOT_FULL', 'Time slot is full');

      const startsAt = new Date(slot.startsAt);
      const publicId = crypto.randomUUID();
      const { id, eventId } = await withDeadlockRetry(() =>
        repo.transaction(async (tx) => {
          // The settings row lock serializes bookings, so the capacity check below is race-free.
          const capacity = await tx.lockSettings();
          const booked = await tx.bookedSeats(startsAt);
          if (booked + input.partySize > capacity) {
            throw new AppError(409, 'SLOT_FULL', 'Time slot is full');
          }
          return tx.insertPending({
            publicId,
            startsAt,
            partySize: input.partySize,
            name: input.name,
            email: input.email,
            phone: input.phone,
            comment: input.comment || null,
            lang: input.lang,
          });
        }),
      );

      const emailStatus = await sendMails({ ...input, id, publicId, startsAt });
      try {
        await repo.setEventEmailStatus(eventId, emailStatus);
      } catch (err) {
        logger.warn(
          { code: safeErrorCode(err), reservationId: id, kind: 'email-status' },
          'Could not record email status',
        );
      }
      return {
        publicId,
        startsAt: startsAt.toISOString(),
        partySize: input.partySize,
        status: 'pending',
      };
    },
  };
}

export type ReservationsService = ReturnType<typeof createReservationsService>;
