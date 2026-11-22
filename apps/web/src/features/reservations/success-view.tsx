import { publicPath } from '@pachamama/shared';
import { CircleCheck } from 'lucide-react';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useLang } from '@/components/public/use-lang';
import type { Confirmation } from './api';
import { formatDateLabel, formatLocalTime, localIsoDate } from './dates';

/** Shown after a successful request: what was asked and what happens next. */
export function SuccessView({
  confirmation,
  headingRef,
}: {
  confirmation: Confirmation;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const { t } = useTranslation();
  const lang = useLang();

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-md border border-selva/25 bg-white p-6 sm:p-10">
      <CircleCheck aria-hidden="true" className="size-10 text-selva" />
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-3xl font-medium tracking-tight text-selva outline-none sm:text-4xl"
      >
        {t('reservations.success.title')}
      </h2>
      <dl className="grid gap-3 sm:grid-cols-[auto_1fr] sm:gap-x-8">
        <dt className="font-semibold">{t('reservations.steps.party')}</dt>
        <dd>{t('reservations.party.option', { count: confirmation.partySize })}</dd>
        <dt className="font-semibold">{t('reservations.steps.date')}</dt>
        <dd>{formatDateLabel(localIsoDate(confirmation.startsAt), lang)}</dd>
        <dt className="font-semibold">{t('reservations.steps.time')}</dt>
        <dd className="tabular-nums">{formatLocalTime(confirmation.startsAt)}</dd>
      </dl>
      <p className="leading-relaxed">{t('reservations.success.next')}</p>
      <Link
        to={publicPath('home', lang)}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-selva px-5 py-2.5 font-semibold text-papel transition-colors hover:bg-selva-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selva"
      >
        {t('reservations.success.home')}
      </Link>
    </div>
  );
}
