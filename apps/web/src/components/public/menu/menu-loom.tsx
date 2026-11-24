import type { Language, PublicMenu } from '@pachamama/shared';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { bandTone, categoryAnchor, readProgress } from './menu-bands';

type Category = PublicMenu['categories'][number];

const pickText = (lang: Language, de: string, es: string) => (lang === 'de' ? de : es);

/**
 * Sticky category bar woven like the manta (ADR 0016): one thread per category, in the colour of
 * its band, that fills as the visitor reads that section. The fill follows the scroll only (it
 * never moves on its own), and the links stay plain text links for keyboard and screen readers.
 */
export function MenuLoom({ categories, lang }: { categories: Category[]; lang: Language }) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.5;
      let current = 0;
      categories.forEach((category, index) => {
        const section = document.getElementById(categoryAnchor(category.id));
        const thread = listRef.current?.querySelector<HTMLElement>(
          `[data-thread="${category.id}"]`,
        );
        if (!section || !thread) return;
        const { top, height } = section.getBoundingClientRect();
        const progress = readProgress(top, height, line);
        thread.style.setProperty('--progress', progress.toFixed(3));
        if (top <= line) current = index;
      });
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [categories]);

  const activeCategory = categories[active];

  return (
    <nav
      aria-label={t('menu.categoriesNav')}
      className="sticky top-(--site-header-h,0px) z-20 border-b border-tierra/15 bg-papel"
    >
      <ul
        ref={listRef}
        className="mx-auto grid max-w-6xl gap-1 px-4 pt-2.5 sm:px-6 md:pb-1"
        style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}
      >
        {categories.map((category, index) => {
          const name = pickText(lang, category.nameDe, category.nameEs);
          const isActive = index === active;
          return (
            <li key={category.id} className="min-w-0">
              <a
                href={`#${categoryAnchor(category.id)}`}
                aria-current={isActive ? 'true' : undefined}
                style={{ '--band': bandTone(index).band } as CSSProperties}
                className="group block min-h-11 rounded-sm pt-1 pb-1.5 text-sm leading-tight font-medium text-muted-foreground hover:text-tierra focus-visible:outline-2 focus-visible:outline-offset-2 aria-[current]:font-semibold aria-[current]:text-tierra"
                onClick={(event) => {
                  const anchor = categoryAnchor(category.id);
                  const section = document.getElementById(anchor);
                  const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
                  if (section && !modified) {
                    // Glide to the section like a mouse-wheel scroll instead of jumping; reduced
                    // motion keeps the instant jump. scroll-padding/-margin still clear the bars.
                    event.preventDefault();
                    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
                    section.scrollIntoView({
                      behavior: reduce ? 'auto' : 'smooth',
                      block: 'start',
                    });
                    window.history.pushState(window.history.state, '', `#${anchor}`);
                  }
                  // Move focus to the heading so keyboard and screen reader users land on the section.
                  requestAnimationFrame(() =>
                    document.getElementById(`${anchor}-title`)?.focus({ preventScroll: true }),
                  );
                }}
              >
                <span
                  aria-hidden="true"
                  className="mb-1.5 block h-2.5 overflow-hidden rounded-[2px] bg-[color-mix(in_srgb,var(--band)_22%,var(--color-papel))] group-hover:bg-[color-mix(in_srgb,var(--band)_40%,var(--color-papel))]"
                >
                  <span data-thread={category.id} className="menu-thread block h-full" />
                </span>
                {/* Names under the threads from tablet up; on a phone only the current one shows below. */}
                <span className="sr-only md:not-sr-only md:block md:hyphens-auto">{name}</span>
              </a>
            </li>
          );
        })}
      </ul>
      {activeCategory ? (
        <p
          aria-hidden="true"
          className="px-4 pt-0.5 pb-2 font-display text-lg text-tierra md:hidden"
        >
          {pickText(lang, activeCategory.nameDe, activeCategory.nameEs)}
        </p>
      ) : null}
    </nav>
  );
}
