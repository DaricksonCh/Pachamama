import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Decorative band inspired by Andean woven textiles (the "manta" in the restaurant's photos):
 * thin coloured warps around a row of diamonds. It is the site's one signature element, so it is
 * used only between header/hero, at a few section breaks and above the footer.
 */
export function WovenStripe({ className }: { className?: string }) {
  const id = useId();
  const patternId = `woven-${id}`;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn('block h-[18px] w-full', className)}
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id={patternId} width="24" height="18" patternUnits="userSpaceOnUse">
          <rect width="24" height="2" y="0" className="fill-aji" />
          <rect width="24" height="1" y="2" className="fill-maiz" />
          <rect width="24" height="12" y="3" className="fill-chicha" />
          <polygon points="12,4 20,9 12,14 4,9" className="fill-maiz" />
          <polygon points="12,6.5 16,9 12,11.5 8,9" className="fill-chicha" />
          <rect x="11" y="8" width="2" height="2" className="fill-papel" />
          <polygon points="0,4 4,9 0,14" className="fill-aji" />
          <polygon points="24,4 20,9 24,14" className="fill-aji" />
          <rect width="24" height="1" y="15" className="fill-maiz" />
          <rect width="24" height="2" y="16" className="fill-aji" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
