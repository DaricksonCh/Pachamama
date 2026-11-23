import { useEffect, useRef } from 'react';

/**
 * Fades an element in the first time it scrolls into view (ADR 0013).
 * Nothing is hidden when the visitor prefers reduced motion or IntersectionObserver is missing,
 * so the content never depends on the animation.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    el.dataset.reveal = 'pending';
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.dataset.reveal = 'done';
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      el.dataset.reveal = 'done';
    };
  }, []);

  return ref;
}
