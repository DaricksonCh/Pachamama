import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import '../i18n';

// findBy*/waitFor: 1 s por defecto se queda corto en el primer render de una página
// cuando `npm run check:all` corre todas las suites en paralelo. Solo alarga la espera,
// no cambia ninguna aserción.
configure({ asyncUtilTimeout: 3000 });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom no implementa matchMedia (lo usa el hook de móvil de shadcn/ui).
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom no implementa ResizeObserver (lo usan Switch y otros componentes de Radix).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
