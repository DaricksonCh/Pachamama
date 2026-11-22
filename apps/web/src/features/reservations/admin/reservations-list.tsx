import { RESERVATION_STATUSES, type ReservationStatus } from '@pachamama/shared';
import { ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { localIsoDate } from '@/features/reservations/dates';
import { LoadError, LoadingBlock } from '@/features/menu/load-states';
import { useReservations } from './api';
import { addDays, formatTime } from './format';
import { ReservationStatusBadge } from './status-badge';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Reservas de un día. La fecha y el filtro de estado viven en la URL. */
export function ReservationsList() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();

  // "Hoy" se recalcula al volver a la pestaña: si pasó la medianoche de Berlín, no se queda viejo.
  const [today, setToday] = useState(() => localIsoDate(new Date()));
  useEffect(() => {
    const refresh = () => setToday(localIsoDate(new Date()));
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  const dateParam = params.get('date');
  const date = dateParam && ISO_DATE.test(dateParam) ? dateParam : today;
  const statusParam = params.get('status');
  const status = RESERVATION_STATUSES.find((s) => s === statusParam);

  const { data, isPending, isError, refetch } = useReservations(date, status);

  const update = (next: { date?: string; status?: ReservationStatus | '' }) => {
    const search = new URLSearchParams(params);
    if (next.date !== undefined) search.set('date', next.date);
    if (next.status !== undefined) {
      if (next.status) search.set('status', next.status);
      else search.delete('status');
    }
    setParams(search, { replace: true });
  };

  let content;
  if (isPending) {
    content = <LoadingBlock rows={['h-12', 'h-12', 'h-12']} />;
  } else if (isError) {
    content = <LoadError onRetry={() => void refetch()} />;
  } else if (data.length === 0) {
    content = (
      <p className="text-muted-foreground">
        {t(status ? 'admin.reservations.emptyFiltered' : 'admin.reservations.empty')}
      </p>
    );
  } else {
    content = (
      <Table>
        <caption className="sr-only">{t('admin.reservations.title')}</caption>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.reservations.columns.time')}</TableHead>
            <TableHead>{t('admin.reservations.columns.name')}</TableHead>
            <TableHead className="text-end">{t('admin.reservations.columns.party')}</TableHead>
            <TableHead>{t('admin.reservations.columns.status')}</TableHead>
            <TableHead>{t('admin.reservations.columns.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="tabular-nums">
                {formatTime(item.startsAt, i18n.language)}
              </TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-end tabular-nums">{item.partySize}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <ReservationStatusBadge status={item.status} />
                  {item.lastEmailFailed ? (
                    <span className="inline-flex items-center gap-1 text-sm text-destructive">
                      <TriangleAlert className="size-4" aria-hidden="true" />
                      <span className="sr-only">{t('admin.reservations.emailFailed')}</span>
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Button asChild variant="outline" size="sm">
                  <Link
                    to={`/admin/reservations/${item.id}`}
                    aria-label={t('admin.reservations.openNamed', { name: item.name })}
                  >
                    {t('admin.reservations.open')}
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="font-display text-3xl font-bold">{t('admin.reservations.title')}</h1>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="reservations-date">{t('admin.reservations.date')}</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t('admin.reservations.prevDay')}
              onClick={() => update({ date: addDays(date, -1) })}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Input
              id="reservations-date"
              type="date"
              className="w-auto"
              value={date}
              onChange={(event) => {
                if (ISO_DATE.test(event.target.value)) update({ date: event.target.value });
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t('admin.reservations.nextDay')}
              onClick={() => update({ date: addDays(date, 1) })}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={date === today}
              onClick={() => update({ date: today })}
            >
              {t('admin.reservations.today')}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reservations-status">{t('admin.reservations.statusFilter')}</Label>
          <NativeSelect
            id="reservations-status"
            value={status ?? ''}
            onChange={(event) => update({ status: event.target.value as ReservationStatus | '' })}
          >
            <option value="">{t('admin.reservations.allStatuses')}</option>
            {RESERVATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`admin.reservations.status.${s}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {content}
    </section>
  );
}
