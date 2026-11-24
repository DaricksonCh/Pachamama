import { useLayoutEffect } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router';

/**
 * Opens every new page (link click or redirect) at the top, or at its #hash.
 *
 * Deliberately not React Router's <ScrollRestoration>: on a fresh load it re-applies a saved
 * position under the shared "default" key a moment later, which yanked visitors back to the top
 * if they had already started scrolling. Here the first load and back/forward (POP) are left to
 * the browser, and only a pathname change scrolls, so in-page #hash updates never jump.
 */
function ScrollToTopOnNavigate() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === 'POP') return;
    if (hash) {
      try {
        const target = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (target) {
          target.scrollIntoView();
          return;
        }
      } catch {
        // Undecodable hash: fall through to the top.
      }
    }
    window.scrollTo(0, 0);
    // Only a new page should scroll; hash and search changes on the same page must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}

/** Root of every route. */
export function RootLayout() {
  return (
    <>
      <ScrollToTopOnNavigate />
      <Outlet />
    </>
  );
}
