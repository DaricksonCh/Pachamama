import { cn } from '@/lib/utils';

/**
 * Look of a selectable option (party size, time slot) on the public pages. Selected = selva
 * background with papel text (contrast about 9:1); the focus outline uses selva, not maiz.
 */
export const optionClass = (extra?: string) =>
  cn(
    'min-h-11 min-w-11 rounded-md border border-selva/70 bg-white px-3 font-semibold text-tierra shadow-none transition-colors',
    'hover:border-selva hover:bg-papel hover:text-tierra',
    'data-[state=on]:border-selva data-[state=on]:bg-selva data-[state=on]:text-papel',
    'focus-visible:border-selva focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selva',
    'motion-reduce:transition-none',
    extra,
  );
