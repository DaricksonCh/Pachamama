import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLang } from '@/components/public/use-lang';
import { Button } from '@/components/ui/button';
import { formatDateShort } from './dates';
import { FORM_ID } from './details-fields';
import { canAdvance, type WizardState } from './wizard-state';

interface BookingSummaryProps {
  state: WizardState;
  submitting: boolean;
  onBack: () => void;
  onNext: () => void;
}

/**
 * The booking so far, always visible: a sticky column on wide screens and a fixed bar with the
 * "next" button on phones. On the last step the button submits the form of the details step.
 */
export function BookingSummary({ state, submitting, onBack, onNext }: BookingSummaryProps) {
  const { t } = useTranslation();
  const lang = useLang();
  const isLast = state.step === 'details';
  const empty = <span aria-hidden="true">–</span>;
  const none = <span className="sr-only">{t('reservations.summary.pending')}</span>;

  return (
    <aside
      aria-label={t('reservations.summary.title')}
      data-booking-bar
      className="fixed inset-x-0 bottom-0 z-40 border-t border-selva/25 bg-papel px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-6px_16px_rgba(31,42,29,0.12)] lg:sticky lg:top-24 lg:z-auto lg:self-start lg:rounded-md lg:border lg:bg-white lg:p-6 lg:shadow-none"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 lg:block">
        <h3 className="hidden font-display text-2xl text-selva lg:block">
          {t('reservations.summary.title')}
        </h3>
        {state.partySize === undefined ? (
          <p className="text-sm font-medium text-selva lg:hidden">
            {t('reservations.summary.hint')}
          </p>
        ) : null}
        <dl
          className={`flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm lg:mt-4 lg:block lg:space-y-3 lg:text-base ${state.partySize === undefined ? 'max-lg:hidden' : ''}`}
        >
          <div className="flex gap-1.5 lg:block">
            <dt className="hidden font-semibold lg:block">{t('reservations.steps.party')}</dt>
            <dd>
              {state.partySize === undefined ? (
                <>
                  {empty}
                  {none}
                </>
              ) : (
                t('reservations.party.option', { count: state.partySize })
              )}
            </dd>
          </div>
          <div className="flex gap-1.5 lg:block">
            <dt className="hidden font-semibold lg:block">{t('reservations.steps.date')}</dt>
            <dd>
              {state.date === undefined ? (
                <>
                  {empty}
                  {none}
                </>
              ) : (
                formatDateShort(state.date, lang)
              )}
            </dd>
          </div>
          <div className="flex gap-1.5 lg:block">
            <dt className="hidden font-semibold lg:block">{t('reservations.steps.time')}</dt>
            <dd className="tabular-nums">
              {state.time === undefined ? (
                <>
                  {empty}
                  {none}
                </>
              ) : (
                state.time
              )}
            </dd>
          </div>
        </dl>

        <div className="flex items-center gap-2 lg:mt-6 lg:flex-col-reverse lg:items-stretch">
          {state.step !== 'party' ? (
            <Button
              key="back"
              type="button"
              variant="ghost"
              onClick={onBack}
              className="min-h-11 px-3 text-selva hover:bg-papel hover:text-selva-deep"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              {t('reservations.back')}
            </Button>
          ) : null}
          {isLast ? (
            <Button
              key="submit"
              type="submit"
              form={FORM_ID}
              disabled={submitting}
              className="min-h-11 bg-selva px-5 text-papel hover:bg-selva-deep"
            >
              {submitting ? t('reservations.sending') : t('reservations.submit')}
            </Button>
          ) : (
            <Button
              key="next"
              type="button"
              onClick={onNext}
              disabled={!canAdvance(state)}
              className="min-h-11 bg-selva px-5 text-papel hover:bg-selva-deep"
            >
              {t('reservations.next')}
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
