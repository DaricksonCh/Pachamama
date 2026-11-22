import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { ProvisionalMark } from './provisional-mark';

describe('ProvisionalMark', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  it('marks placeholder contact data in German and Spanish', async () => {
    const { unmount } = render(<ProvisionalMark />);
    expect(screen.getByText('(vorläufig)')).toBeInTheDocument();
    unmount();

    await i18n.changeLanguage('es');
    render(<ProvisionalMark />);
    expect(screen.getByText('(provisional)')).toBeInTheDocument();
  });
});
