import { z } from 'zod';

export const MESSAGE_TEMPLATE_KINDS = ['received', 'confirmed', 'rejected', 'cancelled'] as const;
export type MessageTemplateKind = (typeof MESSAGE_TEMPLATE_KINDS)[number];

export const messageTemplateInputSchema = z.object({
  subject: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1).max(4000),
});
export type MessageTemplateInput = z.infer<typeof messageTemplateInputSchema>;

export type MessageTemplateVars = {
  name: string;
  date: string;
  time: string;
  party: number | string;
};

const VARIABLE = /\{(name|date|time|party)\}/g;

/** Replaces {name}, {date}, {time} and {party}; any other placeholder stays literal. */
export function renderTemplate(text: string, vars: MessageTemplateVars): string {
  return text.replace(VARIABLE, (_match, key: keyof MessageTemplateVars) => String(vars[key]));
}
