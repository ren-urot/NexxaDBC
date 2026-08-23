import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/lib/card-encoding', () => ({
  decodeCard: vi.fn(),
}));

vi.mock('@/lib/holder-storage', () => ({
  hasCard: vi.fn(),
  saveCard: vi.fn(),
}));

import { useRouter } from 'next/navigation';
import { decodeCard } from '@/lib/card-encoding';
import { hasCard, saveCard } from '@/lib/holder-storage';
import HolderInstallPage from './page';

const replace = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue({ replace } as never);
  window.location.hash = '';
});

describe('HolderInstallPage', () => {
  it('redirects straight to /holder when this device already has a card', async () => {
    vi.mocked(hasCard).mockResolvedValue(true);
    render(<HolderInstallPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/holder'));
    expect(decodeCard).not.toHaveBeenCalled();
  });

  it('shows an invalid state for an undecodable fragment', async () => {
    vi.mocked(hasCard).mockResolvedValue(false);
    vi.mocked(decodeCard).mockReturnValue(null);
    render(<HolderInstallPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/isn.t valid/i);
  });

  it('saves a valid card and redirects to /holder', async () => {
    vi.mocked(hasCard).mockResolvedValue(false);
    const payload = {
      data: { firstName: 'Juan' } as never,
      style: {},
      templateId: 'corporate-vertical',
    };
    vi.mocked(decodeCard).mockReturnValue(payload);
    vi.mocked(saveCard).mockResolvedValue(undefined);
    render(<HolderInstallPage />);
    await waitFor(() => expect(saveCard).toHaveBeenCalledWith(payload));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/holder'));
  });

  it('shows an error state when saving fails', async () => {
    vi.mocked(hasCard).mockResolvedValue(false);
    vi.mocked(decodeCard).mockReturnValue({ data: {} as never, style: {}, templateId: 'corporate-vertical' });
    vi.mocked(saveCard).mockRejectedValue(new Error('quota exceeded'));
    render(<HolderInstallPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t save/i);
  });

  it('shows an error state when checking for an existing card fails', async () => {
    vi.mocked(hasCard).mockRejectedValue(new Error('storage error'));
    render(<HolderInstallPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t save/i);
  });
});
