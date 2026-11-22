type Listener = () => void;

/** Aviso de "la carta cambió" (lo usa la caché del PDF). Un listener que falla no rompe la escritura. */
export function createMenuEvents() {
  const listeners = new Set<Listener>();
  return {
    onMenuChanged(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emitMenuChanged() {
      for (const listener of listeners) {
        try {
          listener();
        } catch {
          // El aviso es secundario: nunca debe fallar la petición que ya guardó los datos.
        }
      }
    },
  };
}

export type MenuEvents = ReturnType<typeof createMenuEvents>;

/** Instancia compartida por la API. */
export const menuEvents = createMenuEvents();
