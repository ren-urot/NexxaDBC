import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/holder-storage', () => ({
  getCard: vi.fn(),
}));

import { getCard } from '@/lib/holder-storage';
import HolderPage from './page';

beforeEach(() => vi.clearAllMocks());

describe('HolderPage', () => {
  it('shows an empty state when no card is saved', async () => {
    vi.mocked(getCard).mockResolvedValue(null);
    render(<HolderPage />);
    expect(await screen.findByText(/no card yet/i)).toBeInTheDocument();
  });

  it('renders the saved card and its actions', async () => {
    vi.mocked(getCard).mockResolvedValue({
      data: {
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        jobTitle: 'Sales Director',
        company: 'ABC Corporation',
        mobile: '+639171234567',
        email: 'juan@abc.com',
      },
      style: {},
      templateId: 'corporate-vertical',
      savedAt: new Date().toISOString(),
    });
    render(<HolderPage />);
    expect(await screen.findByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save to contacts/i })).toBeInTheDocument();
  });
});
