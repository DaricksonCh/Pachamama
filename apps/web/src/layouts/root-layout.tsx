import { Outlet, ScrollRestoration } from 'react-router';

/**
 * Root of every route. ScrollRestoration opens each new page at the top (or at its #hash),
 * and restores the previous position on browser back/forward.
 */
export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}
