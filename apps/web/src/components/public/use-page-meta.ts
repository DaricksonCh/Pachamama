import { useEffect } from 'react';

const SITE_NAME = 'Pachamama';

/**
 * Sets the document title and meta description of a public page. `title` undefined means the
 * home page (site name only). Values must already be translated.
 */
export function usePageMeta(title: string | undefined, description: string) {
  useEffect(() => {
    document.title = title ? `${title} – ${SITE_NAME}` : `${SITE_NAME} – ${description}`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.append(meta);
    }
    meta.content = description;
  }, [title, description]);
}
