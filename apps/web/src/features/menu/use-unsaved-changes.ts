import { useEffect } from 'react';
import { useBlocker } from 'react-router';

/** Avisa antes de perder cambios: navegación interna (useBlocker) y cierre de pestaña. */
export function useUnsavedChanges(isDirty: boolean) {
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return blocker;
}
