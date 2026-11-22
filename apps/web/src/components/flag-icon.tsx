import type { Language } from '@pachamama/shared';
import { cn } from '@/lib/utils';

/**
 * Inline SVG flags (no third-party requests, DSGVO): Germany for German, Spain for Spanish.
 * Decorative: the language name is always given as text or label next to it.
 */
export function FlagIcon({ lang, className }: { lang: Language; className?: string }) {
  return (
    <svg
      viewBox="0 0 30 20"
      aria-hidden="true"
      focusable="false"
      data-flag={lang}
      className={cn(
        'h-3.5 w-[1.3125rem] shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgb(0_0_0/0.15)]',
        className,
      )}
    >
      {lang === 'de' ? (
        <>
          <rect width="30" height="20" fill="#FFCE00" />
          <rect width="30" height="13.34" fill="#DD0000" />
          <rect width="30" height="6.67" fill="#000000" />
        </>
      ) : (
        <>
          <rect width="30" height="20" fill="#AA151B" />
          <rect y="5" width="30" height="10" fill="#F1BF00" />
        </>
      )}
    </svg>
  );
}
