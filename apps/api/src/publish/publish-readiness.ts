import { legalHasPlaceholders, RESTAURANT_INFO } from '@pachamama/shared';

export type RestaurantInfo = typeof RESTAURANT_INFO;

export interface PublishDish {
  nameDe: string;
  isProvisional: boolean;
  imageKey: string | null;
}

export interface PublishInput {
  info: Pick<RestaurantInfo, 'isProvisional' | 'provisionalFields' | 'phone' | 'email'>;
  legalPending: boolean;
  /** Flattened translation strings of every locale (values only). */
  translations: string[];
  /** Visible dishes of the public menu. */
  dishes: PublishDish[];
  /** Returns true when the photo files of an image key exist on disk. */
  imageExists: (key: string) => boolean;
}

const PLACEHOLDER_PATTERNS: [RegExp, string][] = [
  [/lorem ipsum/i, 'placeholder text (lorem ipsum)'],
  [/example\.(com|org)/i, 'example.com address'],
];

/**
 * Everything that must be resolved before the site goes public (docs/pendientes.md).
 * An empty list means the site can be published.
 */
export function collectPublishIssues(input: PublishInput): string[] {
  const issues: string[] = [];
  const { info } = input;

  if (info.isProvisional || info.provisionalFields.length > 0) {
    issues.push(`Restaurant data still provisional: ${info.provisionalFields.join(', ')}`);
  }
  if (input.legalPending) issues.push('Impressum / privacy data still has placeholders');
  if (/0{3}/.test(info.phone.e164)) issues.push('Phone number is a placeholder');
  if (/example\./i.test(info.email)) issues.push('Email address is a placeholder');

  for (const [pattern, label] of PLACEHOLDER_PATTERNS) {
    const count = input.translations.filter((t) => pattern.test(t)).length;
    if (count > 0) issues.push(`Translations contain ${label}: ${count} string(s)`);
  }

  const provisional = input.dishes.filter((d) => d.isProvisional).map((d) => d.nameDe);
  if (provisional.length > 0) {
    issues.push(
      `Visible dishes marked provisional (${provisional.length}): ${provisional.join(', ')}`,
    );
  }
  const missing = input.dishes
    .filter((d) => d.imageKey && !input.imageExists(d.imageKey))
    .map((d) => d.nameDe);
  if (missing.length > 0) {
    issues.push(`Dish photos missing on disk (${missing.length}): ${missing.join(', ')}`);
  }

  return issues;
}

/** Default input from the shared restaurant data. */
export function restaurantPublishInfo() {
  return { info: RESTAURANT_INFO, legalPending: legalHasPlaceholders() };
}

/** Flattens a nested translation object into its string values. */
export function flattenTranslations(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(flattenTranslations);
  if (value && typeof value === 'object') return Object.values(value).flatMap(flattenTranslations);
  return [];
}
