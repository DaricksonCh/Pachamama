import { publicMenuSchema } from '@pachamama/shared';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiGet } from '@/lib/api';

export const publicMenuKey = ['public', 'menu'] as const;

const publicMenuResponse = z.object({ data: publicMenuSchema });

/**
 * Carta pública. La API devuelve los textos en los dos idiomas, así que la clave no
 * depende del idioma: cambiar de idioma no vuelve a pedir nada. Un payload inválido
 * (Zod) acaba en estado de error.
 */
export function usePublicMenu() {
  return useQuery({
    queryKey: publicMenuKey,
    queryFn: async ({ signal }) =>
      (await apiGet('/api/v1/menu', publicMenuResponse, { signal })).data,
  });
}
