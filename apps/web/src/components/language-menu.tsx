import { SUPPORTED_LANGUAGES, type Language } from '@pachamama/shared';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { FlagIcon } from './flag-icon';

/** Each language either links to a URL (public site) or runs an action (admin panel). */
export type LanguageTarget = { href: string } | { onSelect: () => void };

interface LanguageMenuProps {
  current: Language;
  targetFor: (lang: Language) => LanguageTarget;
  className?: string;
  /** Side of the trigger the list lines up with ('start' inside the mobile menu). */
  align?: 'start' | 'end';
}

/** Dropdown with flags to change the language; shared by the public site and /admin. */
export function LanguageMenu({ current, targetFor, className, align = 'end' }: LanguageMenuProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        // The name includes the visible code (WCAG 2.5.3): "Sprache: DE".
        aria-label={`${t('language.label')}: ${current.toUpperCase()}`}
        className={cn(
          'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-offset-2 data-[state=open]:bg-current/10',
          className,
        )}
      >
        <FlagIcon lang={current} />
        <span>{current.toUpperCase()}</span>
        <ChevronDown aria-hidden="true" className="size-4 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-40">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const target = targetFor(lang);
          const isCurrent = lang === current;
          const content = (
            <>
              <FlagIcon lang={lang} />
              <span lang={lang}>{t(`language.${lang}`)}</span>
              {isCurrent ? <Check aria-hidden="true" className="ml-auto size-4" /> : null}
            </>
          );
          return 'href' in target ? (
            <DropdownMenuItem key={lang} asChild className="cursor-pointer gap-2.5">
              <Link to={target.href} aria-current={isCurrent ? 'true' : undefined}>
                {content}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={lang}
              onSelect={target.onSelect}
              aria-current={isCurrent ? 'true' : undefined}
              className="cursor-pointer gap-2.5"
            >
              {content}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
