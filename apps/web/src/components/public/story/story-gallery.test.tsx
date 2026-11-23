import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { StoryGallery } from './story-gallery';

beforeEach(async () => {
  await i18n.changeLanguage('de');
});

function currentDot() {
  return screen
    .getAllByRole('button', { name: /^Zu Foto/ })
    .find((b) => b.getAttribute('aria-current') === 'true');
}

describe('story gallery', () => {
  it('is a labelled carousel with described photos', () => {
    render(<StoryGallery />);
    const region = screen.getByRole('region', { name: 'Einblicke' });
    expect(region).toHaveAttribute('aria-roledescription', 'Karussell');
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    for (const img of screen.getAllByRole('img')) expect(img).toHaveAccessibleName();
    expect(screen.getByText('Foto 1 von 8', { selector: '[aria-live]' })).toBeInTheDocument();
  });

  it('moves with the arrows and wraps around', () => {
    render(<StoryGallery />);
    fireEvent.click(screen.getByRole('button', { name: 'Nächstes Foto' }));
    expect(currentDot()).toHaveAccessibleName('Zu Foto 2');
    expect(screen.getByText('Foto 2 von 8', { selector: '[aria-live]' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Vorheriges Foto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vorheriges Foto' }));
    expect(currentDot()).toHaveAccessibleName('Zu Foto 8');
  });

  it('jumps to a photo from its dot', () => {
    render(<StoryGallery />);
    fireEvent.click(screen.getByRole('button', { name: 'Zu Foto 4' }));
    expect(currentDot()).toHaveAccessibleName('Zu Foto 4');
  });

  it('renders in Spanish', async () => {
    await i18n.changeLanguage('es');
    render(<StoryGallery />);
    expect(screen.getByRole('region', { name: 'Momentos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Foto siguiente' })).toBeInTheDocument();
  });
});
