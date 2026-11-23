import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReveal } from './use-reveal';

function Block() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="block">
      text
    </div>
  );
}

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

function mockMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduce && query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function mockObserver() {
  const callbacks: ObserverCallback[] = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: ObserverCallback) {
        callbacks.push(cb);
      }
      observe() {}
      disconnect() {}
    },
  );
  return callbacks;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useReveal', () => {
  it('hides the block until it scrolls into view', () => {
    mockMotion(false);
    const callbacks = mockObserver();
    render(<Block />);
    const block = screen.getByTestId('block');
    expect(block).toHaveAttribute('data-reveal', 'pending');

    act(() => callbacks[0]?.([{ isIntersecting: true }]));
    expect(block).toHaveAttribute('data-reveal', 'done');
  });

  it('never hides anything when the visitor prefers reduced motion', () => {
    mockMotion(true);
    mockObserver();
    render(<Block />);
    expect(screen.getByTestId('block')).not.toHaveAttribute('data-reveal');
  });

  it('never hides anything without IntersectionObserver', () => {
    mockMotion(false);
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Block />);
    expect(screen.getByTestId('block')).not.toHaveAttribute('data-reveal');
  });
});
