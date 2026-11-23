import {
  closureSchema,
  MESSAGE_TEMPLATE_KINDS,
  messageTemplateInputSchema,
  openingHoursSchema,
  SUPPORTED_LANGUAGES,
} from '@pachamama/shared';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { parseOrThrow } from '../../lib/parse';
import type { SettingsService } from './settings.service';

const hoursBodySchema = z.object({ hours: openingHoursSchema });
/** Partial patch: known keys only; values are validated after merging, with the full schema. */
const settingsPatchSchema = z.strictObject({
  slotMinutes: z.unknown().optional(),
  lastSlotBeforeCloseMinutes: z.unknown().optional(),
  partyMin: z.unknown().optional(),
  partyMax: z.unknown().optional(),
  capacityPerSlot: z.unknown().optional(),
  minLeadMinutes: z.unknown().optional(),
  maxAdvanceDays: z.unknown().optional(),
  sameDayOnline: z.unknown().optional(),
});
const idParam = z.coerce.number().int().positive();
const templateParams = z.object({
  kind: z.enum(MESSAGE_TEMPLATE_KINDS),
  lang: z.enum(SUPPORTED_LANGUAGES),
});

export function createSettingsController(service: SettingsService) {
  const getHours: RequestHandler = async (_req, res) => {
    res.json({ data: await service.getHours() });
  };
  const putHours: RequestHandler = async (req, res) => {
    res.json({ data: await service.replaceHours(parseOrThrow(hoursBodySchema, req.body).hours) });
  };

  const listClosures: RequestHandler = async (_req, res) => {
    res.json({ data: await service.listClosures() });
  };
  const createClosure: RequestHandler = async (req, res) => {
    res
      .status(201)
      .json({ data: await service.createClosure(parseOrThrow(closureSchema, req.body)) });
  };
  const deleteClosure: RequestHandler = async (req, res) => {
    await service.deleteClosure(parseOrThrow(idParam, req.params.id));
    res.status(204).end();
  };

  const getSettings: RequestHandler = async (_req, res) => {
    res.json({ data: await service.getSettings() });
  };
  const patchSettings: RequestHandler = async (req, res) => {
    res.json({ data: await service.updateSettings(parseOrThrow(settingsPatchSchema, req.body)) });
  };

  const listTemplates: RequestHandler = async (_req, res) => {
    res.json({ data: await service.listTemplates() });
  };
  const putTemplate: RequestHandler = async (req, res) => {
    const { kind, lang } = parseOrThrow(templateParams, req.params);
    const input = parseOrThrow(messageTemplateInputSchema, req.body);
    res.json({ data: await service.saveTemplate(kind, lang, input) });
  };

  return {
    getHours,
    putHours,
    listClosures,
    createClosure,
    deleteClosure,
    getSettings,
    patchSettings,
    listTemplates,
    putTemplate,
  };
}
