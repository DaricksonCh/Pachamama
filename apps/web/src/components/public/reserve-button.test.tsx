import { RESTAURANT_INFO } from '@pachamama/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { ReserveButton } from './reserve-button';

describe('ReserveButton', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  it('calls the restaurant while reservations are by phone', () => {
    render(<ReserveButton mode="phone" />, { wrapper: MemoryRouter });

    const link = screen.getByRole('link', { name: /Tisch reservieren/ });
    expect(link).toHaveAttribute('href', `tel:${RESTAURANT_INFO.phone.e164}`);
    expect(link).toHaveAccessibleName(
      `Tisch reservieren telefonisch unter ${RESTAURANT_INFO.phone.display}`,
    );
  });

  it('links to the localized reservations page in form mode', async () => {
    await i18n.changeLanguage('es');
    render(<ReserveButton mode="form" />, { wrapper: MemoryRouter });

    expect(screen.getByRole('link', { name: 'Reservar mesa' })).toHaveAttribute(
      'href',
      '/es/reservar',
    );
  });
});
