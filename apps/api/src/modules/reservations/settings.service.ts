import {
  reservationSettingsSchema,
  toRestaurantLocal,
  type Closure,
  type OpeningHours,
  type ReservationSettings,
} from '@pachamama/shared';
import type { ReservationLang, ReservationMessageKind } from '../../db/types';
import { AppError } from '../../lib/app-error';
import type { MessageTemplate, SettingsRepository, StoredClosure } from './settings.repository';

export type BookingContext = {
  hours: OpeningHours;
  closures: Closure[];
  settings: ReservationSettings;
};

const today = () => toRestaurantLocal(new Date()).date;

export function createSettingsService(repo: SettingsRepository) {
  let cache: { day: string; value: BookingContext } | null = null;
  const invalidate = () => {
    cache = null;
  };

  /** Hours, upcoming closures and settings for the booking engine (cached until a write). */
  async function getBookingContext(): Promise<BookingContext> {
    const day = today();
    if (cache && cache.day === day) return cache.value;
    const [hours, closures, settings] = await Promise.all([
      repo.getHours(),
      repo.listClosuresFrom(day),
      repo.getSettings(),
    ]);
    const value = { hours, closures, settings };
    cache = { day, value };
    return value;
  }

  async function getHours() {
    return { hours: await repo.getHours(), hoursConfirmed: await repo.getHoursConfirmed() };
  }

  return {
    invalidate,
    getBookingContext,

    getHours,
    async replaceHours(hours: OpeningHours) {
      await repo.replaceHours(hours);
      invalidate();
      return getHours();
    },

    listClosures(): Promise<StoredClosure[]> {
      return repo.listClosuresFrom(today());
    },
    async createClosure(input: Closure) {
      const created = await repo.createClosure(input);
      invalidate();
      return created;
    },
    async deleteClosure(id: number) {
      if (!(await repo.deleteClosure(id))) {
        throw new AppError(404, 'NOT_FOUND', 'Closure not found');
      }
      invalidate();
    },

    getSettings: () => repo.getSettings(),
    async updateSettings(patch: Record<string, unknown>) {
      const merged = { ...(await repo.getSettings()), ...patch };
      const parsed = reservationSettingsSchema.safeParse(merged);
      if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? '_');
          (fieldErrors[key] ??= []).push(issue.message);
        }
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', fieldErrors);
      }
      await repo.updateSettings(parsed.data);
      invalidate();
      return parsed.data;
    },

    listTemplates: () => repo.listTemplates(),
    async saveTemplate(
      kind: ReservationMessageKind,
      lang: ReservationLang,
      input: { subject: string; body: string },
    ): Promise<MessageTemplate> {
      const t = { kind, lang, ...input };
      await repo.saveTemplate(t);
      return t;
    },
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;
