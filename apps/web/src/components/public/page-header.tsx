import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  lead?: ReactNode;
  /** Optional element shown on the right on wide screens (e.g. a download button). */
  aside?: ReactNode;
}

/** Title block shared by the inner public pages (menu, story, contact, legal). */
export function PageHeader({ title, lead, aside }: PageHeaderProps) {
  return (
    <div className="bg-selva text-papel">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-4 py-12 sm:px-6 md:py-16">
        <div className="max-w-2xl space-y-4">
          <h1 className="font-display text-4xl font-medium tracking-tight break-words hyphens-auto sm:text-5xl md:text-6xl">
            {title}
          </h1>
          {lead ? <p className="text-lg leading-relaxed text-papel/85">{lead}</p> : null}
        </div>
        {aside}
      </div>
    </div>
  );
}
