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
