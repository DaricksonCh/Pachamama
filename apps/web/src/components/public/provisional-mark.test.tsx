import type * as Shared from '@pachamama/shared';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { ProvisionalMark } from './provisional-mark';

const provisional = vi.hoisted(() => ({ value: true }));
vi.mock('@pachamama/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof Shared>()),
  contactIsProvisional: () => provisional.value,
}));

describe('ProvisionalMark', () => {
  beforeEach(async () => {
    provisional.value = true;
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

  it('renders nothing once the restaurant has confirmed its contact data', () => {
    provisional.value = false;
    const { container } = render(<ProvisionalMark />);
    expect(container).toBeEmptyDOMElement();
  });
});
