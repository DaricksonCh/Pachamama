import {
  type Closure,
  type MessageTemplateInput,
  type MessageTemplateKind,
  type OpeningHoursRange,
  type ReservationSettings,
  MESSAGE_TEMPLATE_KINDS,
  reservationSettingsSchema,
} from '@pachamama/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet, apiSend } from '@/lib/api';

const BASE = '/api/v1/admin/reservation-settings';

export const reservationSettingsKeys = {
  all: ['admin', 'reservation-settings'] as const,
  hours: () => [...reservationSettingsKeys.all, 'hours'] as const,
  closures: () => [...reservationSettingsKeys.all, 'closures'] as const,
  settings: () => [...reservationSettingsKeys.all, 'settings'] as const,
  templates: () => [...reservationSettingsKeys.all, 'templates'] as const,
};

// Lo guardado puede ser incorrecto (horario provisional): al leer no se aplican las
// reglas de solape; se validan al guardar.
const rangeSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  opens: z.string(),
  closes: z.string(),
});
const hoursResponse = z.object({
  data: z.object({ hours: z.array(rangeSchema), hoursConfirmed: z.boolean() }),
});

const closureRowSchema = z.object({
  id: z.number(),
  from: z.string(),
  to: z.string(),
  reasonDe: z.string().nullish(),
  reasonEs: z.string().nullish(),
});
export type StoredClosure = z.infer<typeof closureRowSchema>;

const templateRowSchema = z.object({
  kind: z.enum(MESSAGE_TEMPLATE_KINDS),
  lang: z.enum(['de', 'es']),
  subject: z.string(),
  body: z.string(),
});
export type StoredTemplate = z.infer<typeof templateRowSchema>;

export function useHours() {
  return useQuery({
    queryKey: reservationSettingsKeys.hours(),
    queryFn: async ({ signal }) => (await apiGet(`${BASE}/hours`, hoursResponse, { signal })).data,
  });
}

export function useClosures() {
  return useQuery({
    queryKey: reservationSettingsKeys.closures(),
    queryFn: async ({ signal }) =>
      (await apiGet(`${BASE}/closures`, z.object({ data: z.array(closureRowSchema) }), { signal }))
        .data,
  });
}

export function useReservationSettings() {
  return useQuery({
    queryKey: reservationSettingsKeys.settings(),
    queryFn: async ({ signal }) =>
      (await apiGet(`${BASE}/settings`, z.object({ data: reservationSettingsSchema }), { signal }))
        .data,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: reservationSettingsKeys.templates(),
    queryFn: async ({ signal }) =>
      (
        await apiGet(`${BASE}/templates`, z.object({ data: z.array(templateRowSchema) }), {
          signal,
        })
      ).data,
  });
}

/** Cada escritura invalida solo la consulta de su pestaña. */
function useSettingsMutation<TVariables>(
  queryKey: readonly unknown[],
  mutationFn: (variables: TVariables) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useSaveHours() {
  return useSettingsMutation(reservationSettingsKeys.hours(), (hours: OpeningHoursRange[]) =>
    apiSend('PUT', `${BASE}/hours`, { hours }, hoursResponse),
  );
}

export function useCreateClosure() {
  return useSettingsMutation(reservationSettingsKeys.closures(), (closure: Closure) =>
    apiSend('POST', `${BASE}/closures`, closure),
  );
}

export function useDeleteClosure() {
  return useSettingsMutation(reservationSettingsKeys.closures(), (id: number) =>
    apiSend('DELETE', `${BASE}/closures/${id}`),
  );
}

export type SettingsPatch = Omit<ReservationSettings, 'slotMinutes'>;

export function useSaveSettings() {
  return useSettingsMutation(reservationSettingsKeys.settings(), (patch: SettingsPatch) =>
    apiSend('PATCH', `${BASE}/settings`, patch),
  );
}

export function useSaveTemplate() {
  return useSettingsMutation(
    reservationSettingsKeys.templates(),
    ({
      kind,
      lang,
      ...input
    }: MessageTemplateInput & { kind: MessageTemplateKind; lang: 'de' | 'es' }) =>
      apiSend('PUT', `${BASE}/templates/${kind}/${lang}`, input),
  );
}
