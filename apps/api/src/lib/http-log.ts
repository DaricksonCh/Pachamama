/**
 * Serializadores de los logs de peticiones (pino-http).
 * DSGVO: no se guardan IP, user agent, cabeceras ni cuerpos (datos personales).
 * La URL se registra sin query string, por si algún día lleva datos (emails, tokens).
 */
export const httpLogSerializers = {
  req: (req: { id?: unknown; method?: string; url?: string }) => ({
    id: req.id,
    method: req.method,
    url: req.url?.split('?')[0],
  }),
  res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
};
