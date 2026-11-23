import {
  RESERVATION_STATUSES,
  SUPPORTED_LANGUAGES,
  type ReservationStatus,
  type ReservationStatusChange,
} from '@pachamama/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet, apiSend } from '@/lib/api';

const BASE = '/api/v1/admin/reservations';

/** Claves de consulta: todas cuelgan de `all` para invalidarlas juntas. */
export const reservationKeys = {
  all: ['admin', 'reservations'] as const,
  list: (date: string, status?: ReservationStatus) =>
    [...reservationKeys.all, 'list', { date, status }] as const,
  pending: () => [...reservationKeys.all, 'pending-count'] as const,
  detail: (id: number) => [...reservationKeys.all, 'detail', id] as const,
  preview: (id: number, status: string) => [...reservationKeys.all, 'preview', id, status] as const,
};

const statusSchema = z.enum(RESERVATION_STATUSES);
const languageSchema = z.enum(SUPPORTED_LANGUAGES);
const emailStatusSchema = z.enum(['sent', 'failed', 'skipped']);
export type EmailStatus = z.infer<typeof emailStatusSchema>;

const reservationSchema = z.object({
  id: z.number(),
  publicId: z.string(),
  startsAt: z.string(),
  partySize: z.number(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  comment: z.string().nullable(),
  lang: languageSchema,
  status: statusSchema,
  decidedAt: z.string().nullable().optional(),
});

const listItemSchema = reservationSchema.extend({ lastEmailFailed: z.boolean() });
export type AdminReservationItem = z.infer<typeof listItemSchema>;

const eventSchema = z.object({
  id: z.number(),
  fromStatus: statusSchema.nullable(),
  toStatus: statusSchema,
  actorName: z.string().nullable(),
  message: z.string().nullable(),
  subject: z.string().nullable().optional(),
  emailStatus: emailStatusSchema.nullable(),
  createdAt: z.string(),
});
export type ReservationEvent = z.infer<typeof eventSchema>;

const detailSchema = reservationSchema.extend({ events: z.array(eventSchema) });
export type AdminReservationDetail = z.infer<typeof detailSchema>;

const previewSchema = z.object({
  subject: z.string(),
  body: z.string(),
  lang: languageSchema,
});
export type MessagePreview = z.infer<typeof previewSchema>;

function queryString(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function useReservations(date: string, status?: ReservationStatus) {
  return useQuery({
    queryKey: reservationKeys.list(date, status),
    queryFn: async ({ signal }) =>
      (
        await apiGet(
          `${BASE}${queryString({ date, status })}`,
          z.object({ data: z.array(listItemSchema) }),
          { signal },
        )
      ).data,
  });
}

/** Reservas pendientes de decidir (contador del menú lateral); se refresca cada minuto. */
export function usePendingCount() {
  return useQuery({
    queryKey: reservationKeys.pending(),
    refetchInterval: 60_000,
    queryFn: async ({ signal }) =>
      (
        await apiGet(`${BASE}/pending-count`, z.object({ data: z.object({ count: z.number() }) }), {
          signal,
        })
      ).data.count,
  });
}

export function useReservation(id: number | undefined) {
  return useQuery({
    queryKey: reservationKeys.detail(id ?? 0),
    enabled: id !== undefined,
    queryFn: async ({ signal }) =>
      (await apiGet(`${BASE}/${id}`, z.object({ data: detailSchema }), { signal })).data,
  });
}

/** Texto predeterminado del correo. Siempre fresco: no se reutiliza entre aperturas. */
export function useMessagePreview(id: number, status: string) {
  return useQuery({
    queryKey: reservationKeys.preview(id, status),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ signal }) =>
      (
        await apiGet(
          `${BASE}/${id}/message-preview${queryString({ status })}`,
          z.object({ data: previewSchema }),
          { signal },
        )
      ).data,
  });
}

const changeResponse = z.object({ data: z.object({ emailStatus: emailStatusSchema.nullable() }) });

/** Una escritura cambia lista, ficha y contador a la vez. */
function useInvalidatingMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationKeys.all }),
  });
}

export function useChangeStatus(id: number) {
  return useInvalidatingMutation(
    async (change: ReservationStatusChange) =>
      (await apiSend('PATCH', `${BASE}/${id}/status`, change, changeResponse)).data.emailStatus,
  );
}

export function useResendEmail(id: number) {
  return useInvalidatingMutation(
    async () =>
      (await apiSend('POST', `${BASE}/${id}/resend-email`, undefined, changeResponse)).data
        .emailStatus,
  );
}
