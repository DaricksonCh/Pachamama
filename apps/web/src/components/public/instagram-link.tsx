import { RESTAURANT_INFO } from '@pachamama/shared';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/** Instagram glyph (inline SVG: lucide no longer ships brand icons, and no third-party requests). */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

/** Plain link to the restaurant's Instagram profile (no embed or plugin: no data sent until clicked). */
export function InstagramLink({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { t } = useTranslation();
  const label = t('social.instagram');

  return (
    <a
      href={RESTAURANT_INFO.social.instagram}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={showLabel ? undefined : `${label} ${t('social.newTab')}`}
      className={cn(
        'inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-md transition-colors hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-offset-2',
        className,
      )}
    >
      <InstagramIcon className="size-5" />
      {showLabel ? (
        <span>
          {label}
          <span className="sr-only"> {t('social.newTab')}</span>
        </span>
      ) : null}
    </a>
  );
}
