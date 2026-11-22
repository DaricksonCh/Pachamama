import { describe, expect, it } from 'vitest';
import {
  collectPublishIssues,
  flattenTranslations,
  restaurantPublishInfo,
  type PublishInput,
} from './publish-readiness';

const ready: PublishInput = {
  info: {
    isProvisional: false,
    provisionalFields: [],
    phone: { e164: '+494215551234', display: '0421 555 1234' },
    email: 'hola@pachamama-bremen.de',
  } as unknown as PublishInput['info'],
  legalPending: false,
  translations: ['Willkommen', 'Speisekarte'],
  dishes: [{ nameDe: 'Ceviche', isProvisional: false, imageKey: 'abc' }],
  imageExists: () => true,
};

describe('collectPublishIssues', () => {
  it('returns no issues when everything is confirmed', () => {
    expect(collectPublishIssues(ready)).toEqual([]);
  });

  it('blocks publication with the current provisional restaurant data', () => {
    const issues = collectPublishIssues({ ...ready, ...restaurantPublishInfo() });
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/provisional/),
        expect.stringMatching(/Impressum/),
        expect.stringMatching(/Phone/),
        expect.stringMatching(/Email/),
      ]),
    );
  });

  it('flags lorem ipsum, provisional dishes and missing photos', () => {
    const issues = collectPublishIssues({
      ...ready,
      translations: ['Lorem ipsum dolor sit amet'],
      dishes: [
        { nameDe: 'Tiradito', isProvisional: true, imageKey: null },
        { nameDe: 'Tamal', isProvisional: false, imageKey: 'gone' },
      ],
      imageExists: (key) => key !== 'gone',
    });
    expect(issues).toEqual([
      'Translations contain placeholder text (lorem ipsum): 1 string(s)',
      'Visible dishes marked provisional (1): Tiradito',
      'Dish photos missing on disk (1): Tamal',
    ]);
  });
});

describe('flattenTranslations', () => {
  it('collects nested string values', () => {
    expect(flattenTranslations({ a: 'x', b: { c: 'y', d: ['z'] }, n: 1 })).toEqual(['x', 'y', 'z']);
  });
});
