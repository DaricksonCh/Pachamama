import { zodResolver } from '@hookform/resolvers/zod';
import { reservationRequestSchema } from '@pachamama/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLang } from '@/components/public/use-lang';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { applyServerErrors } from '@/features/menu/form-errors';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { availabilityKey, createReservation } from './api';
import { BookingSummary } from './booking-summary';
import { restaurantToday, toMonthKey } from './dates';
import { DateStep } from './steps/date-step';
import { DETAILS_FIELDS, type ClientRequest, type DetailsValues } from './details-fields';
import { DetailsStep } from './steps/details-step';
import { PartyStep } from './steps/party-step';
import { TimeStep } from './steps/time-step';
import { SuccessView } from './success-view';
import { useMonthAvailability, useSlots } from './use-availability';
import { initialWizardState, STEPS, wizardReducer, type StepId } from './wizard-state';

const EMPTY_DETAILS: DetailsValues = {
  name: '',
  email: '',
  phone: '',
  comment: '',
  privacyAccepted: false,
  website: '',
};

/** Whole wizard: progress bar, current step, booking summary and the success view. */
export function ReservationWizard() {
  const { t } = useTranslation();
  const lang = useLang();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  const [month, setMonth] = useState(() => {
    const today = restaurantToday();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [submitError, setSubmitError] = useState<string>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // The month feeds the party limits (step 1) and the calendar (step 2).
  const monthQuery = useMonthAvailability(toMonthKey(month));
  const slotsQuery = useSlots(state.date, state.partySize);

  // Keyboard and screen-reader users land on the new step's heading.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [state.step]);

  const resolver = useMemo(() => {
    const base = zodResolver(
      reservationRequestSchema.omit({ website: true }),
    ) as unknown as Resolver<DetailsValues, unknown, ClientRequest>;
    // The choices of steps 1–3 live in the reducer; they join the form values for validation.
    const { partySize, date, time } = state;
    const merged: Resolver<DetailsValues, unknown, ClientRequest> = (values, ctx, options) =>
      base({ ...values, partySize, date, time, lang } as unknown as DetailsValues, ctx, options);
    return merged;
  }, [state, lang]);

  const form = useForm<DetailsValues, unknown, ClientRequest>({
    shouldFocusError: false,
    resolver,
    defaultValues: EMPTY_DETAILS,
  });

  const create = useMutation({ mutationFn: createReservation });

  const onSubmit = form.handleSubmit(async (data) => {
    setSubmitError(undefined);
    try {
      const confirmation = await create.mutateAsync({
        ...data,
        comment: data.comment || undefined,
        // The real honeypot value goes to the server, which rejects bots.
        website: form.getValues('website'),
      });
      dispatch({ type: 'done', confirmation });
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.code === 'SLOT_FULL' || err.code === 'SLOT_UNAVAILABLE')
      ) {
        void queryClient.invalidateQueries({ queryKey: availabilityKey.allSlots });
        void queryClient.invalidateQueries({ queryKey: ['public', 'reservations', 'month'] });
        dispatch({ type: 'slotFull' });
      } else if (err instanceof ApiError && err.status === 400) {
        const shown = applyServerErrors(err, DETAILS_FIELDS, form.setError, {
          privacyAccepted: 'privacy',
        });
        const outside = Object.keys(err.details ?? {}).some(
          (key) => !(DETAILS_FIELDS as readonly string[]).includes(key) && key !== 'website',
        );
        if (!shown || outside) setSubmitError(t('reservations.errors.generic'));
      } else if (err instanceof ApiError && err.status === 429) {
        setSubmitError(t('reservations.errors.rateLimited'));
      } else if (err instanceof ApiError) {
        setSubmitError(t('reservations.errors.generic'));
      } else {
        setSubmitError(t('reservations.errors.network'));
      }
    }
  });

  if (state.step === 'success' && state.confirmation) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
        <SuccessView confirmation={state.confirmation} headingRef={headingRef} />
      </div>
    );
  }

  const stepIndex = STEPS.indexOf(state.step as StepId);
  const settings = monthQuery.data;
  const headings: Record<StepId, string> = {
    party: t('reservations.party.heading'),
    date: t('reservations.date.heading'),
    time: t('reservations.time.heading'),
    details: t('reservations.details.heading'),
  };
  const step = state.step as StepId;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 md:pt-12">
      <nav aria-label={t('reservations.progress')}>
        <ol className="grid grid-cols-4 gap-2 sm:gap-4">
          {STEPS.map((id, index) => {
            const done = index < stepIndex;
            const current = index === stepIndex;
            return (
              <li
                key={id}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'border-t-4 pt-2 text-sm sm:text-base',
                  current || done ? 'border-selva' : 'border-selva/20',
                  current ? 'font-semibold text-selva' : done ? 'text-selva' : 'text-tierra/70',
                )}
              >
                {done ? (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'goto', step: id })}
                    className="min-h-11 rounded-sm text-start font-medium underline decoration-maiz decoration-2 underline-offset-[6px] hover:decoration-selva focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selva sm:min-h-0"
                  >
                    {t(`reservations.steps.${id}`)}
                  </button>
                ) : (
                  <span>
                    <span aria-hidden="true">{index + 1}. </span>
                    {t(`reservations.steps.${id}`)}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="min-w-0 space-y-6">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-3xl font-medium tracking-tight text-selva outline-none sm:text-4xl"
          >
            {headings[step]}
          </h2>

          {step === 'party' ? (
            settings ? (
              <PartyStep
                partySize={state.partySize}
                partyMin={settings.partyMin}
                partyMax={settings.partyMax}
                onChange={(partySize) => dispatch({ type: 'party', partySize })}
              />
            ) : monthQuery.isError ? (
              <div className="space-y-3">
                <p role="alert" className="font-medium text-aji">
                  {t('reservations.errors.loadFailed')}
                </p>
                <Button variant="outline" onClick={() => void monthQuery.refetch()}>
                  {t('reservations.retry')}
                </Button>
              </div>
            ) : (
              <div role="status" className="flex flex-wrap gap-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="size-12 motion-reduce:animate-none" />
                ))}
                <span className="sr-only">{t('reservations.party.loading')}</span>
              </div>
            )
          ) : null}

          {step === 'date' ? (
            <DateStep
              query={monthQuery}
              month={month}
              onMonthChange={setMonth}
              date={state.date}
              onChange={(date) => dispatch({ type: 'date', date })}
            />
          ) : null}

          {step === 'time' ? (
            <TimeStep
              query={slotsQuery}
              time={state.time}
              slotFull={state.slotFull}
              onChange={(time) => dispatch({ type: 'time', time })}
            />
          ) : null}

          {step === 'details' ? (
            <DetailsStep form={form} onSubmit={onSubmit} submitError={submitError} />
          ) : null}
        </div>

        <BookingSummary
          state={state}
          submitting={form.formState.isSubmitting}
          onBack={() => dispatch({ type: 'back' })}
          onNext={() => dispatch({ type: 'next' })}
        />
      </div>
    </div>
  );
}
