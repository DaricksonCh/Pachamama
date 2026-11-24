import { act, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RootLayout } from './root-layout';

function renderRouter() {
  const router = createMemoryRouter(
    [
      {
        element: <RootLayout />,
        children: [
          { path: '/a', element: <h1 id="top">A</h1> },
          { path: '/b', element: <h2 id="section">B</h2> },
        ],
      },
    ],
    { initialEntries: ['/a'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('RootLayout scroll handling', () => {
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not touch the scroll on the first load, so an early user scroll is never undone', () => {
    renderRouter();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('opens a new page at the top', async () => {
    const router = renderRouter();
    await act(() => router.navigate('/b'));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('jumps to the #hash of a new page instead of the top', async () => {
    const router = renderRouter();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    await act(() => router.navigate('/b#section'));
    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('leaves back/forward to the browser', async () => {
    const router = renderRouter();
    await act(() => router.navigate('/b'));
    scrollTo.mockClear();
    await act(() => router.navigate(-1));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
