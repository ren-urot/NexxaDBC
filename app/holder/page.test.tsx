import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/holder-storage', () => ({
  getCards: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

import { getCards } from '@/lib/holder-storage';
import { useRouter } from 'next/navigation';
import HolderPage from './page';

const juan = {
  id: 'card-1',
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
  savedAt: '2026-01-01T00:00:00.000Z',
};

const maria = {
  id: 'card-2',
  data: {
    firstName: 'Maria',
    lastName: 'Santos',
    jobTitle: 'CEO',
    company: 'XYZ Trading',
    mobile: '+639171234568',
    email: 'maria@xyz.com',
  },
  style: {},
  templateId: 'modern-horizontal',
  savedAt: '2026-01-02T00:00:00.000Z',
};

const replace = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue({ replace } as never);
});

describe('HolderPage (My Card Holder list)', () => {
  it('redirects to the homepage when no cards are saved — a holder only exists once a DBC has been received', async () => {
    vi.mocked(getCards).mockResolvedValue([]);
    render(<HolderPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(screen.queryByText(/my card holder/i)).not.toBeInTheDocument();
  });

  it('redirects to the homepage when loading cards fails', async () => {
    vi.mocked(getCards).mockRejectedValue(new Error('storage error'));
    render(<HolderPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('shows the closed holder first, opening into the card list on tap', async () => {
    vi.mocked(getCards).mockResolvedValue([maria, juan]);
    render(<HolderPage />);
    const openButton = await screen.findByRole('button', { name: /open card holder/i });
    expect(screen.queryByLabelText('Search cards')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    await userEvent.click(openButton);
    expect(await screen.findByLabelText('Search cards')).toBeInTheDocument();
  });

  it('collapses back to the closed holder when the back arrow is tapped', async () => {
    vi.mocked(getCards).mockResolvedValue([maria, juan]);
    render(<HolderPage />);
    await userEvent.click(await screen.findByRole('button', { name: /open card holder/i }));
    expect(await screen.findByLabelText('Search cards')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close card holder/i }));
    expect(await screen.findByRole('button', { name: /open card holder/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Search cards')).not.toBeInTheDocument();
  });

  it('lists every saved card, linking to its detail page', async () => {
    vi.mocked(getCards).mockResolvedValue([maria, juan]);
    render(<HolderPage />);
    await userEvent.click(await screen.findByRole('button', { name: /open card holder/i }));

    const juanLink = await screen.findByRole('link', { name: /juan dela cruz/i });
    expect(juanLink).toHaveAttribute('href', '/holder/card-1');
    expect(screen.getByText('Sales Director')).toBeInTheDocument();
    const mariaLink = screen.getByRole('link', { name: /maria santos/i });
    expect(mariaLink).toHaveAttribute('href', '/holder/card-2');
  });

  it('filters cards by name or company as the user types', async () => {
    vi.mocked(getCards).mockResolvedValue([maria, juan]);
    render(<HolderPage />);
    await userEvent.click(await screen.findByRole('button', { name: /open card holder/i }));
    await screen.findByRole('link', { name: /juan dela cruz/i });

    await userEvent.type(screen.getByLabelText('Search cards'), 'xyz');
    expect(screen.queryByRole('link', { name: /juan dela cruz/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /maria santos/i })).toBeInTheDocument();
  });

  it('links the Scan Card button to the in-app scanner', async () => {
    vi.mocked(getCards).mockResolvedValue([maria, juan]);
    render(<HolderPage />);
    expect(await screen.findByRole('link', { name: /scan card/i })).toHaveAttribute('href', '/holder/scan');
  });
});
