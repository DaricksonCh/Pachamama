import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { LanguageSwitcher } from './language-switcher';

async function openAt(path: string) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageSwitcher />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole('button', { name: /Sprache/ }));
}

describe('LanguageSwitcher', () => {
  it('shows the current language with its flag and opens a dropdown with both flags', async () => {
    await openAt('/de/speisekarte');
    const trigger = screen.getByRole('button', { name: 'Sprache: DE' });
    expect(trigger.querySelector('[data-flag="de"]')).not.toBeNull();

    const es = screen.getByRole('menuitem', { name: 'Español' });
    const de = screen.getByRole('menuitem', { name: 'Deutsch' });
    expect(es.querySelector('[data-flag="es"]')).not.toBeNull();
    expect(de.querySelector('[data-flag="de"]')).not.toBeNull();
    expect(de).toHaveAttribute('aria-current', 'true');
  });

  it('keeps the visitor on the equivalent page', async () => {
    await openAt('/de/speisekarte');
    expect(screen.getByRole('menuitem', { name: 'Español' })).toHaveAttribute('href', '/es/carta');
    expect(screen.getByRole('menuitem', { name: 'Deutsch' })).toHaveAttribute(
      'href',
      '/de/speisekarte',
    );
  });

  it('keeps the section anchor of a known page', async () => {
    await openAt('/es/carta#ceviches');
    expect(screen.getByRole('menuitem', { name: 'Deutsch' })).toHaveAttribute(
      'href',
      '/de/speisekarte#ceviches',
    );
  });

  it('falls back to the home page for unknown paths', async () => {
    await openAt('/de/unbekannt');
    expect(screen.getByRole('menuitem', { name: 'Español' })).toHaveAttribute('href', '/es');
  });
});
