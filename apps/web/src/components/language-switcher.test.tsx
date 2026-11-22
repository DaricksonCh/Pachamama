import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { LanguageSwitcher } from './language-switcher';

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageSwitcher />
    </MemoryRouter>,
  );
}

describe('LanguageSwitcher', () => {
  it('keeps the visitor on the equivalent page', () => {
    renderAt('/de/speisekarte');
    expect(screen.getByRole('link', { name: 'Español' })).toHaveAttribute('href', '/es/carta');
    expect(screen.getByRole('link', { name: 'Deutsch' })).toHaveAttribute(
      'href',
      '/de/speisekarte',
    );
  });

  it('keeps the section anchor of a known page', () => {
    renderAt('/es/carta#ceviches');
    expect(screen.getByRole('link', { name: 'Deutsch' })).toHaveAttribute(
      'href',
      '/de/speisekarte#ceviches',
    );
  });

  it('falls back to the home page for unknown paths', () => {
    renderAt('/de/unbekannt');
    expect(screen.getByRole('link', { name: 'Español' })).toHaveAttribute('href', '/es');
  });
});
