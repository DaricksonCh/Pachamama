import { RESTAURANT_INFO } from '@pachamama/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InstagramLink } from './instagram-link';

describe('InstagramLink', () => {
  it('links to the Instagram profile in a new tab without leaking the opener', () => {
    render(<InstagramLink />);
    const link = screen.getByRole('link', { name: /Pachamama auf Instagram/ });
    expect(link).toHaveAttribute('href', RESTAURANT_INFO.social.instagram);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(RESTAURANT_INFO.social.instagram).toMatch(
      /^https:\/\/www\.instagram\.com\/pachamamarestaurantebremen\/$/,
    );
  });

  it('shows the visible label when asked', () => {
    render(<InstagramLink showLabel />);
    expect(screen.getByText('Pachamama auf Instagram')).toBeVisible();
  });
});
