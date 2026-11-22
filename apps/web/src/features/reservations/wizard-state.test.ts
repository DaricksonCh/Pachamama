import { describe, expect, it } from 'vitest';
import { canAdvance, initialWizardState, wizardReducer, type WizardState } from './wizard-state';

const at = (state: Partial<WizardState>): WizardState => ({ ...initialWizardState, ...state });

describe('wizardReducer', () => {
  it('starts on the party step with nothing chosen', () => {
    expect(initialWizardState).toMatchObject({ step: 'party' });
    expect(initialWizardState.partySize).toBeUndefined();
  });

  it('cannot advance until the current step has a value', () => {
    expect(canAdvance(at({ step: 'party' }))).toBe(false);
    expect(canAdvance(at({ step: 'party', partySize: 2 }))).toBe(true);
    expect(canAdvance(at({ step: 'date', partySize: 2 }))).toBe(false);
    expect(canAdvance(at({ step: 'time', partySize: 2, date: '2026-11-25' }))).toBe(false);
    expect(canAdvance(at({ step: 'time', partySize: 2, date: '2026-11-25', time: '19:00' }))).toBe(
      true,
    );
  });

  it('changing the party size clears date and time, keeping an unchanged size intact', () => {
    const chosen = at({ step: 'party', partySize: 2, date: '2026-11-25', time: '19:00' });
    expect(wizardReducer(chosen, { type: 'party', partySize: 2 })).toMatchObject({
      date: '2026-11-25',
      time: '19:00',
    });
    const changed = wizardReducer(chosen, { type: 'party', partySize: 5 });
    expect(changed).toMatchObject({ partySize: 5, date: undefined, time: undefined });
  });

  it('changing the date clears the time', () => {
    const chosen = at({ step: 'date', partySize: 2, date: '2026-11-25', time: '19:00' });
    expect(wizardReducer(chosen, { type: 'date', date: '2026-11-26' })).toMatchObject({
      date: '2026-11-26',
      time: undefined,
    });
  });

  it('goes next and back keeping the data', () => {
    const start = at({ step: 'time', partySize: 2, date: '2026-11-25', time: '19:00' });
    const back = wizardReducer(start, { type: 'back' });
    expect(back).toMatchObject({ step: 'date', date: '2026-11-25', time: '19:00' });
    expect(wizardReducer(back, { type: 'next' }).step).toBe('time');
  });

  it('does not go back before the first step or next without a value', () => {
    expect(wizardReducer(at({ step: 'party' }), { type: 'back' }).step).toBe('party');
    expect(wizardReducer(at({ step: 'party' }), { type: 'next' }).step).toBe('party');
  });

  it('jumps back only to steps already completed', () => {
    const state = at({ step: 'details', partySize: 2, date: '2026-11-25', time: '19:00' });
    expect(wizardReducer(state, { type: 'goto', step: 'date' }).step).toBe('date');
    const early = at({ step: 'date', partySize: 2 });
    expect(wizardReducer(early, { type: 'goto', step: 'details' }).step).toBe('date');
  });

  it('a full slot returns to the time step, clears the time and flags the notice', () => {
    const state = at({ step: 'details', partySize: 2, date: '2026-11-25', time: '19:00' });
    const full = wizardReducer(state, { type: 'slotFull' });
    expect(full).toMatchObject({ step: 'time', time: undefined, slotFull: true });
    expect(wizardReducer(full, { type: 'time', time: '20:00' }).slotFull).toBe(false);
  });

  it('stores the confirmation on success', () => {
    const done = wizardReducer(at({ step: 'details' }), {
      type: 'done',
      confirmation: { publicId: 'abc', startsAt: '2026-11-25T18:00:00.000Z', partySize: 2 },
    });
    expect(done.step).toBe('success');
    expect(done.confirmation?.publicId).toBe('abc');
  });
});
