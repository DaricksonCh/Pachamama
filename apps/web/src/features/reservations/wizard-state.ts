import type { Confirmation } from './api';

export const STEPS = ['party', 'date', 'time', 'details'] as const;
export type StepId = (typeof STEPS)[number];

export interface WizardState {
  step: StepId | 'success';
  partySize?: number;
  /** `YYYY-MM-DD`. */
  date?: string;
  /** Restaurant-local `HH:mm`. */
  time?: string;
  /** The chosen slot was taken meanwhile (409): shows the notice on the time step. */
  slotFull: boolean;
  confirmation?: Confirmation;
}

export type WizardAction =
  | { type: 'party'; partySize: number }
  | { type: 'date'; date: string }
  | { type: 'time'; time: string }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goto'; step: StepId }
  | { type: 'slotFull' }
  | { type: 'done'; confirmation: Confirmation };

export const initialWizardState: WizardState = { step: 'party', slotFull: false };

const stepIndex = (step: WizardState['step']) => STEPS.indexOf(step as StepId);

/** Has the current step a value, so the visitor can go on? (details submit the form instead). */
export function canAdvance(state: WizardState): boolean {
  switch (state.step) {
    case 'party':
      return state.partySize !== undefined;
    case 'date':
      return state.date !== undefined;
    case 'time':
      return state.time !== undefined;
    default:
      return false;
  }
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'party':
      if (action.partySize === state.partySize) return state;
      return {
        ...state,
        partySize: action.partySize,
        date: undefined,
        time: undefined,
        slotFull: false,
      };
    case 'date':
      if (action.date === state.date) return state;
      return { ...state, date: action.date, time: undefined, slotFull: false };
    case 'time':
      return { ...state, time: action.time, slotFull: false };
    case 'next': {
      const index = stepIndex(state.step);
      const target = STEPS[index + 1];
      return canAdvance(state) && target ? { ...state, step: target } : state;
    }
    case 'back': {
      const target = STEPS[stepIndex(state.step) - 1];
      return target ? { ...state, step: target } : state;
    }
    case 'goto':
      // Only to steps already behind the current one.
      return stepIndex(action.step) < stepIndex(state.step)
        ? { ...state, step: action.step }
        : state;
    case 'slotFull':
      return { ...state, step: 'time', time: undefined, slotFull: true };
    case 'done':
      return { ...state, step: 'success', confirmation: action.confirmation };
  }
}
